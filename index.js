const { google } = require('googleapis');
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionsBitField } = require('discord.js');
require('dotenv').config();

// Utwórz instancję klienta
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers // Dodajemy intenst do obsługi członków gildii
    ]
});

// Obiekt do przechowywania liczby ostrzeżeń i wyciszeń
const userWarnings = {};
const userMutes = {};

// Komendy slash do rejestracji
const commands = [
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),
    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to kick')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to ban')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mute a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to mute')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Unmute a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to unmute')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to warn')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('showwarnings')
        .setDescription('Shows the number of warnings for a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to show warnings for')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('showmutes')
        .setDescription('Shows the number of mutes for a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to show mutes for')
                .setRequired(true))
]
.map(command => command.toJSON());

// Funkcja do rejestracji komend
const registerCommands = async () => {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        console.log('Rejestracja / komendy rozpoczęta.');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log('Rejestracja / komendy zakończona.');
    } catch (error) {
        console.error(error);
    }
};

// Gdy bot jest gotowy
client.once('ready', async () => {
    console.log(`Zalogowano jako ${client.user.tag}`);
    await registerCommands();
});

// System powitań
client.on('guildMemberAdd', member => {
    const channel = member.guild.channels.cache.find(ch => ch.name === 'welcome'); // Zmień 'welcome' na nazwę kanału powitalnego
    if (!channel) return;
    channel.send(`Witamy na serwerze, ${member}! Cieszymy się, że dołączyłeś/aś.`);
});

// Reaguj na interakcje
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;

    if (commandName === 'ping') {
        await interaction.reply('Pong!');
    } else if (commandName === 'kick') {
        const user = options.getUser('user');
        const member = interaction.guild.members.cache.get(user.id);
        if (member) {
            try {
                await member.kick();
                await interaction.reply(`${user.tag} został wyrzucony.`);
            } catch (error) {
                await interaction.reply(`Nie udało się wyrzucić ${user.tag}.`);
                console.error(error);
            }
        } else {
            await interaction.reply('Nie znaleziono użytkownika.');
        }
    } else if (commandName === 'ban') {
        const user = options.getUser('user');
        const member = interaction.guild.members.cache.get(user.id);
        if (member) {
            try {
                await member.ban();
                await interaction.reply(`${user.tag} został zbanowany.`);
            } catch (error) {
                await interaction.reply(`Nie udało się zbanować ${user.tag}.`);
                console.error(error);
            }
        } else {
            await interaction.reply('Nie znaleziono użytkownika.');
        }
    } else if (commandName === 'mute') {
        const user = options.getUser('user');
        const member = interaction.guild.members.cache.get(user.id);
        if (member) {
            try {
                await member.timeout(24 * 60 * 60 * 1000); // 24 hours mute
                if (!userMutes[user.id]) {
                    userMutes[user.id] = 0;
                }
                userMutes[user.id]++;
                await interaction.reply(`${user.tag} został wyciszony na 24 godziny.`);
            } catch (error) {
                await interaction.reply(`Nie udało się wyciszyć ${user.tag}.`);
                console.error(error);
            }
        } else {
            await interaction.reply('Nie znaleziono użytkownika.');
        }
    } else if (commandName === 'unmute') {
        const user = options.getUser('user');
        const member = interaction.guild.members.cache.get(user.id);
        if (member) {
            try {
                await member.timeout(null); // Remove timeout
                await interaction.reply(`${user.tag} został odciszony.`);
            } catch (error) {
                await interaction.reply(`Nie udało się odciszyć ${user.tag}.`);
                console.error(error);
            }
        } else {
            await interaction.reply('Nie znaleziono użytkownika.');
        }
    } else if (commandName === 'warn') {
        const user = options.getUser('user');
        if (!userWarnings[user.id]) {
            userWarnings[user.id] = 0;
        }
        userWarnings[user.id]++;
        await interaction.reply(`${user.tag} otrzymał ostrzeżenie. Liczba ostrzeżeń: ${userWarnings[user.id]}.`);
    } else if (commandName === 'showwarnings') {
        const user = options.getUser('user');
        const warnings = userWarnings[user.id] || 0;
        await interaction.reply(`${user.tag} ma ${warnings} ostrzeżeń.`);
    } else if (commandName === 'showmutes') {
        const user = options.getUser('user');
        const mutes = userMutes[user.id] || 0;
        await interaction.reply(`${user.tag} ma ${mutes} wyciszeń.`);
    }
});

// Tworzymy klienta dla YouTube Data API
const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY // Klucz API do YouTube Data API
});

// Funkcja sprawdzająca nowe filmy na kanale YouTube
async function checkNewVideos(channelId) {
    try {
        const response = await youtube.activities.list({
            part: 'snippet',
            channelId: channelId,
            maxResults: 5, // Maksymalnie 5 ostatnich filmów
            order: 'date' // Sortowanie według daty
        });

        const activities = response.data.items;
        const latestVideo = activities[0]; // Pobieramy najnowszy film

        // Tutaj możemy porównać najnowszy film z zapisanym wcześniej, aby sprawdzić, czy to nowy film
        // Możemy też zaimplementować zapisywanie informacji o ostatnio sprawdzonym filmie, aby uniknąć powtarzania się

        // Jeśli jest to nowy film, wysyłamy powiadomienie na kanał Discord
        const channel = client.channels.cache.get('1149029769124524218'); // ID kanału Discord, na którym chcemy wysłać powiadomienie
        if (channel) {
            channel.send(`Nowy film na kanale YouTube: ${latestVideo.snippet.title}\n${latestVideo.snippet.description}\nhttps://www.youtube.com/watch?v=${latestVideo.id}`);
        }
    } catch (error) {
        console.error('Błąd podczas sprawdzania nowych filmów:', error);
    }
}

// Sprawdzamy co 5 minut (300000 milisekund)
setInterval(() => {
    checkNewVideos('ID_kanału_YouTube'); // ID kanału YouTube, którego chcemy śledzić
}, 300000);

// Zaloguj się przy użyciu tokena bota
client.login(process.env.DISCORD_TOKEN);
