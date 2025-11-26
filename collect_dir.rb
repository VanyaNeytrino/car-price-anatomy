#!/usr/bin/env ruby

require 'fileutils'

# Проверяем, что передали аргумент - путь к директории
if ARGV.empty?
  puts "Использование: #{$0} путь/к/директории"
  puts "Пример: #{$0} tmp/scans/scan_231"
  exit 1
end

input_dir = ARGV[0]

unless Dir.exist?(input_dir)
  puts "❌ Ошибка: директория не найдена - #{input_dir}"
  exit 1
end

# Получаем имя каталога для названия файла
dir_name = File.basename(input_dir)
output_file = File.join(Dir.pwd, "#{dir_name}.txt")

begin
  File.open(output_file, 'w') do |outfile|
    # Добавляем заголовок файла
    outfile.puts "# Файл собран автоматически из директории #{input_dir}"
    outfile.puts "# Дата создания: #{Time.now}"
    outfile.puts "# Выходной файл: #{output_file}"
    outfile.puts "\n" + "="*80 + "\n"

    # Получаем список всех файлов рекурсивно
    files_list = Dir.glob(File.join(input_dir, '**', '*')).select { |f| File.file?(f) }

    if files_list.empty?
      outfile.puts "# В директории нет файлов для объединения"
      puts "⚠️  Предупреждение: в директории #{input_dir} нет файлов"
    else
      puts "🔍 Найдено файлов: #{files_list.size}"
    end

    files_list.sort.each_with_index do |file_path, index|
      # Получаем относительный путь от исходной директории
      relative_path = file_path.sub(/^\Q#{input_dir}\E\/?/, '')

      puts "Обрабатываю: #{relative_path}"

      # Добавляем разделитель и информацию о файле
      outfile.puts "\n# #{index + 1}. Файл: #{relative_path}"

      begin
        content = File.read(file_path)
        file_size = File.size(file_path)

        outfile.puts "# Размер: #{file_size} байт"
        outfile.puts "#" + "-"*78

        if content.empty?
          outfile.puts "# ⚠️  ФАЙЛ ПУСТ"
        else
          outfile.puts content
        end

      rescue => e
        outfile.puts "# ❌ Ошибка чтения файла: #{e.message}"
        warn "⚠️  Не удалось прочитать файл: #{file_path} (#{e.message})"
      end

      # Добавляем разделитель между файлами
      outfile.puts "\n" + "="*80 + "\n" unless index == files_list.length - 1
    end

    # Добавляем статистику в конец файла
    outfile.puts "\n# Конец файла"
    outfile.puts "# Всего обработано файлов: #{files_list.size}"
    outfile.puts "# Пустых файлов: #{files_list.count { |f| File.size(f) == 0 rescue 0 }}"
  end

  puts "✅ Все файлы успешно объединены в #{output_file}"
  puts "📊 Размер итогового файла: #{File.size(output_file)} байт"

rescue => e
  puts "❌ Ошибка при создании файла: #{e.message}"
  exit 1
end
