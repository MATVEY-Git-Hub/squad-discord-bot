require('dotenv').config();

const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const cron = require('node-cron');
const express = require('express');

const token = process.env.DISCORD_TOKEN;
const serverId = process.env.SERVER_ID;
const channelId = process.env.CHANNEL_ID;

// Создание HTTP-сервера
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Бот работает!');
});

app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
});

// Массив эмодзи, соответствующий каждому месяцу
const emojis = ['🎅', '🥶', '💐', '🌺', '🌸🖐', '😎', '🌞', '🍎', '🎒', '🍁', '🍂', '🎄'];

// Месяцы
const months = ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня', 'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'];

// Функция для изменения имени канала
async function updateChannelName() {
    const guild = client.guilds.cache.get(serverId);
    const channel = guild.channels.cache.get(channelId);

    const currentDate = new Date();
    const moscowDate = new Date(currentDate.toLocaleString("en-US", { timeZone: "Europe/Moscow" }));
    const day = moscowDate.getDate();
    const monthIndex = moscowDate.getMonth();
    const month = months[monthIndex];  // Название месяца из массива
    const emojiForMonth = emojis[monthIndex];  // Эмодзи для текущего месяца

    const newName = `${emojiForMonth}┃Дата: ${day} ${month}`;
    await channel.setName(newName);
    console.log(`Имя канала изменено на: ${newName}`);
}

// Логирование следующей смены названия канала
function logNextUpdateTime() {
    const currentDate = new Date();
    const nextMidnightMsk = new Date(currentDate.toLocaleString("en-US", { timeZone: "Europe/Moscow" }));
    nextMidnightMsk.setHours(24, 0, 0, 0); // Устанавливаем на следующую полночь по МСК

    const day = nextMidnightMsk.getDate();
    const month = months[nextMidnightMsk.getMonth()]; // Название месяца из массива

    console.log(`Следующее обновление канала будет: ${day} ${month} в 00:00 по МСК`);
}

// Регистрация команды /date
const commands = [
    new SlashCommandBuilder()
        .setName('date')
        .setDescription('Показывает сегодняшнюю дату с эмодзи месяца'),
    new SlashCommandBuilder()
        .setName('status')
        .setDescription('Показывает статус бота и ссылку на аптаймер')
].map(command => command.toJSON());

client.once('ready', async () => {
    console.log(`Бот запущен как ${client.user.tag}`);

    // Регистрация команд через Discord API 
    const rest = new REST({ version: '10' }).setToken(token);
    try {
        console.log('Начинаем регистрацию команд...');
        await rest.put(
            Routes.applicationGuildCommands(client.user.id, serverId), // Регистрация команды для конкретного сервера 
            { body: commands }
        );
        console.log('Команды успешно зарегистрированы.');
    } catch (error) {
        console.error('Ошибка при регистрации команд:', error);
    }

    // Логирование следующего обновления
    logNextUpdateTime();

    // Запуск задачи по расписанию каждый день в 00:00 по МСК
    cron.schedule('0 0 * * *', () => {
        updateChannelName();
        logNextUpdateTime(); // Обновление следующего времени после смены
    }, {
        timezone: "Europe/Moscow" // Устанавливаем часовой пояс на Москву 
    });

    // Первое изменение имени при запуске бота 
    updateChannelName();
});

// Обработка взаимодействия с командами
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    console.log(`Received command: ${interaction.commandName}`); // Логирование команды
    if (interaction.commandName === 'date') {
        const currentDate = new Date();
        const moscowDate = new Date(currentDate.toLocaleString("en-US", { timeZone: "Europe/Moscow" }));
        const day = moscowDate.getDate();
        const monthIndex = moscowDate.getMonth();
        const month = months[monthIndex]; // Название месяца из массива
        const emojiForMonth = emojis[monthIndex];

        // Создаём embed-сообщение
        const embed = new EmbedBuilder()
            .setColor('#a7c3ff') // Устанавливаем цвет
            .setTitle('📅┃Сегодняшняя дата') // Заголовок
            .setDescription(`${emojiForMonth}┃Сегодня: **${day} ${month}**`) // Описание
            .setThumbnail('https://i.imgur.com/MyLllJx.png') // Иконка
            .setTimestamp(new Date()) // Текущая дата/время
            .setFooter({ text: 'Дата предоставлена SQUAD по МСК', iconURL: 'https://i.imgur.com/MyLllJx.png' }); // Подпись

        await interaction.reply({ embeds: [embed] }); // Отправляем embed
    } else if (interaction.commandName === 'status') {
        console.log('Handling /status command'); // Логирование команды status
        const statusEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🟢┃Статус бота')
            .setDescription('Бот работает стабильно!')
            .addFields({ name: '🔗┃Ссылка на аптаймер', value: '[Проверить статус](https://stats.uptimerobot.com/m9spnIIBsW)' }) // Используем addFields
            .setTimestamp(new Date())
            .setFooter({ text: 'Статус предоставлен SQUAD', iconURL: 'https://i.imgur.com/MyLllJx.png' });

        await interaction.reply({ embeds: [statusEmbed] });
        console.log('Status embed sent'); // Логирование успешной отправки
    }
});

client.login(token);
