// prisma/seed.ts
//
// Суммы слоёв больше не вбиваются руками — они считаются калькулятором из
// входных данных (цена в юанях, курс, объём, мощность, схема ввоза).
// Именно ручной ввод привёл к тому, что у Zeekr стоял утильсбор 34 000 ₽,
// а две машины были посчитаны по разным курсам юаня.
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { calcBreakdown, ageBandFromYear, type Powertrain, type ImportScheme } from '../src/lib/pricing'
import { fetchCbrRates } from '../src/lib/cbr'

const prisma = new PrismaClient({ log: ['warn', 'error'] })

// Запасные курсы на случай, если ЦБ недоступен: сид должен отрабатывать и офлайн.
const FALLBACK_RATES = { cny: 12.5519, eur: 97.8728, date: new Date('2026-09-12') }

type CarSeed = {
  id: string
  brand: string
  model: string
  year: number
  basePriceCny: number
  engineCc: number
  powerHp: number
  powertrain: Powertrain
  importScheme: ImportScheme
  logisticsRub: number
  marginRub: number
  image: string
  maskImage: string
  viewBox: string
  svgPath: string
  specs: { engine: string; power: string; range: string }
}

// Цены — за модели 2026 модельного года, комплектации по китайскому прайсу.
//
// ВНИМАНИЕ по Zeekr 001: российские дилеры называют комплектации своими
// именами (WE, Ultra) и они не ложатся один в один на китайскую линейку
// Max / Ultra / Ultra+. Цена «от 6,06 млн» на сайтах — заманивающая: честный
// расчёт по базовой Max даёт больше. Маржа подобрана так, чтобы итог попадал
// в реальный диапазон, но по 001 её стоит перепроверить отдельно.
//
// ВНИМАНИЕ по картинкам: public/cars/zeekr-001*.png — временные заглушки,
// это фотографии 009. Заменить файлами настоящего 001, менять код не нужно.
//
// Идентификаторы читаемые и служат адресом страницы: /car/zeekr-001-ultra.
const CARS: CarSeed[] = [
  {
    id: 'lixiang-l9-ultra',
    brand: 'Lixiang',
    model: 'L9 Ultra',
    year: 2026,
    basePriceCny: 459_800,
    engineCc: 1500,
    powerHp: 449,
    powertrain: 'EREV',
    importScheme: 'INDIVIDUAL',
    logisticsRub: 460_000,
    marginRub: 1_400_000,
    viewBox: '0 0 1000 380',
    svgPath: '',
    image: '/cars/lixiang.png',
    maskImage: '/cars/l9-mask.png',
    specs: { engine: '1.5T EREV', power: '449 л.с.', range: '1315 км' },
  },
  {
    id: 'zeekr-009',
    brand: 'Zeekr',
    model: '009',
    year: 2026,
    basePriceCny: 439_800,
    engineCc: 0,
    powerHp: 544,
    powertrain: 'EV',
    importScheme: 'INDIVIDUAL',
    logisticsRub: 500_000,
    marginRub: 1_670_000,
    viewBox: '0 0 500 200',
    svgPath: '',
    image: '/cars/zeekr.png',
    maskImage: '/cars/zeekr-mask.png',
    specs: { engine: 'Электро', power: '544 л.с.', range: '702 км' },
  },
  {
    // Max 103 kWh RWD — базовая версия китайского прайса.
    id: 'zeekr-001-max',
    brand: 'Zeekr',
    model: '001 Max',
    year: 2026,
    basePriceCny: 269_800,
    engineCc: 0,
    powerHp: 496,
    powertrain: 'EV',
    importScheme: 'INDIVIDUAL',
    logisticsRub: 450_000,
    marginRub: 900_000,
    viewBox: '0 0 500 200',
    svgPath: '',
    image: '/cars/zeekr-001.png',
    maskImage: '/cars/zeekr-001-mask.png',
    specs: { engine: 'Электро, задний привод', power: '496 л.с.', range: '810 км' },
  },
  {
    // Ultra 103 kWh AWD, два мотора.
    id: 'zeekr-001-ultra',
    brand: 'Zeekr',
    model: '001 Ultra',
    year: 2026,
    basePriceCny: 299_800,
    engineCc: 0,
    powerHp: 912,
    powertrain: 'EV',
    importScheme: 'INDIVIDUAL',
    logisticsRub: 450_000,
    marginRub: 2_000_000,
    viewBox: '0 0 500 200',
    svgPath: '',
    image: '/cars/zeekr-001.png',
    maskImage: '/cars/zeekr-001-mask.png',
    specs: { engine: 'Электро, полный привод', power: '912 л.с.', range: '762 км' },
  },
]

/** Слои, которые дилер задаёт сам — калькулятор их не пересчитывает. */
const MANUAL_KINDS = new Set(['LOGISTICS', 'MARGIN'])

async function seedOrganization(name: string, slug: string, email: string, password: string) {
  const org = await prisma.organization.upsert({
    where: { slug },
    update: { name },
    create: { name, slug },
  })

  const passwordHash = await bcrypt.hash(password, 10)
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, organizationId: org.id },
    create: { email, name: name, passwordHash, role: 'OWNER', organizationId: org.id },
  })

  return org
}

async function main() {
  // Пароли в сиде общеизвестны, потому что лежат в репозитории. Запуск по
  // ошибке на проде создал бы учётку, в которую может войти кто угодно.
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_SEED !== 'yes') {
    throw new Error(
      'Сид содержит тестовые пароли и не предназначен для прода. ' +
      'Если это осознанное действие — ALLOW_PROD_SEED=yes.'
    )
  }

  console.log('Сеем данные...')

  let rates = FALLBACK_RATES
  try {
    const live = await fetchCbrRates()
    rates = live
    console.log(`Курс ЦБ на ${live.date.toLocaleDateString('ru-RU')}: ${live.cny.toFixed(4)} ₽/¥`)
  } catch {
    console.log(`ЦБ недоступен, беру запасной курс ${FALLBACK_RATES.cny} ₽/¥`)
  }

  const rucars = await seedOrganization('RuCars Import', 'rucars', 'admin@rucars.ru', 'password123')
  // Вторая организация нужна, чтобы было на чём проверять мультитенантность.
  const tesla = await seedOrganization('Tesla Import', 'tesla-import', 'admin@teslaimport.ru', 'password123')
  console.log(`Организации: ${rucars.name}, ${tesla.name}`)

  for (const car of CARS) {
    const result = calcBreakdown({
      basePriceCny: car.basePriceCny,
      cnyRate: rates.cny,
      eurRate: rates.eur,
      engineCc: car.engineCc,
      powerHp: car.powerHp,
      powertrain: car.powertrain,
      ageBand: ageBandFromYear(car.year),
      scheme: car.importScheme,
      logisticsRub: car.logisticsRub,
      marginRub: car.marginRub,
    })

    // deleteMany, а не delete: не бросает и не шумит в лог, когда записи ещё нет.
    await prisma.car.deleteMany({ where: { id: car.id } })

    await prisma.car.create({
      data: {
        id: car.id,
        organizationId: rucars.id,
        isTemplate: true,
        brand: car.brand,
        model: car.model,
        year: car.year,
        viewBox: car.viewBox,
        svgPath: car.svgPath,
        image: car.image,
        maskImage: car.maskImage,
        specs: car.specs,
        basePriceCny: car.basePriceCny,
        cnyRate: rates.cny,
        eurRate: rates.eur,
        rateDate: rates.date,
        engineCc: car.engineCc,
        powerHp: car.powerHp,
        powertrain: car.powertrain,
        importScheme: car.importScheme,
        costs: {
          create: result.layers.map((layer, index) => ({
            label: layer.label,
            amount: layer.amount,
            color: layer.color,
            description: layer.description,
            order: index,
            kind: layer.kind,
            isAuto: !MANUAL_KINDS.has(layer.kind),
          })),
        },
      },
    })

    const total = (result.total / 1_000_000).toFixed(2)
    console.log(`  ${car.brand} ${car.model}: ${result.layers.length} слоёв, итого ${total} млн ₽`)
    result.warnings.forEach((w) => console.log(`  ! ${w}`))
  }

  console.log('Готово.')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
