// prisma/seed.ts
//
// Суммы слоёв больше не вбиваются руками — они считаются калькулятором из
// входных данных (цена в юанях, курс, объём, мощность, схема ввоза).
// Именно ручной ввод привёл к тому, что у Zeekr стоял утильсбор 34 000 ₽,
// а две машины были посчитаны по разным курсам юаня.
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { calcBreakdown, ageBandFromYear, type Powertrain, type ImportScheme } from '../src/lib/pricing'

const prisma = new PrismaClient({ log: ['warn', 'error'] })

// Курсы ЦБ РФ на 12.09.2026. В приложении обновляются из настроек организации.
const CNY_RATE = 12.5637
const EUR_RATE = 96.5
const RATE_DATE = new Date('2026-09-12')

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

// ВНИМАНИЕ: цены — за модели 2026 модельного года (L9 после рестайла с активной
// подвеской, 009 на 900 В). Строки specs достались от дорестайла и требуют
// сверки с актуальными характеристиками.
const CARS: CarSeed[] = [
  {
    id: 'lixiang-l9',
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
    svgPath: 'M50,150 Q60,100 120,90 L280,85 L680,75 Q750,80 780,130 L890,140 Q910,160 910,220 L910,260 Q910,290 880,300 L800,300 Q800,230 730,230 Q660,230 660,300 L340,300 Q340,230 270,230 Q200,230 200,300 L100,300 Q80,300 80,270 L80,220 Q80,180 50,150 Z',
    image: '/cars/lixiang.png',
    maskImage: '/cars/l9-mask.png',
    specs: { engine: '1.5T EREV', power: '449 л.с.', range: '1315 км' },
  },
  {
    id: 'zeekr-009',
    brand: 'Zeekr',
    model: '009',
    year: 2026,
    // Обычный 009, а не Grand за 789 000 ¥: в России возят именно его,
    // и рыночные 7,6-11,3 млн ₽ относятся к этой версии.
    basePriceCny: 439_800,
    engineCc: 0, // чистый электромобиль — рабочего объёма нет
    powerHp: 544,
    powertrain: 'EV',
    importScheme: 'INDIVIDUAL',
    logisticsRub: 500_000,
    marginRub: 1_000_000,
    viewBox: '0 0 500 200',
    svgPath: 'M30,140 L40,70 L140,40 L400,40 L460,80 L460,150 L430,170 L390,170 Q390,130 350,130 Q310,130 310,170 L190,170 Q190,130 150,130 Q110,130 110,170 L30,170 Z',
    image: '/cars/zeekr.png',
    maskImage: '/cars/zeekr-mask.png',
    specs: { engine: 'Электро', power: '544 л.с.', range: '702 км' },
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

  const rucars = await seedOrganization('RuCars Import', 'rucars', 'admin@rucars.ru', 'password123')
  // Вторая организация нужна, чтобы было на чём проверять мультитенантность.
  const tesla = await seedOrganization('Tesla Import', 'tesla-import', 'admin@teslaimport.ru', 'password123')
  console.log(`Организации: ${rucars.name}, ${tesla.name}`)

  for (const car of CARS) {
    const result = calcBreakdown({
      basePriceCny: car.basePriceCny,
      cnyRate: CNY_RATE,
      eurRate: EUR_RATE,
      engineCc: car.engineCc,
      powerHp: car.powerHp,
      powertrain: car.powertrain,
      ageBand: ageBandFromYear(car.year),
      scheme: car.importScheme,
      logisticsRub: car.logisticsRub,
      marginRub: car.marginRub,
    })

    await prisma.car.delete({ where: { id: car.id } }).catch(() => {})

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
        cnyRate: CNY_RATE,
        eurRate: EUR_RATE,
        rateDate: RATE_DATE,
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
