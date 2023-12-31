const { REST, Routes, Client, Collection, Events, GatewayIntentBits } = require('discord.js');
// const dotenv = require('dotenv');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const query = require('./command/query');
const alert = require('./alert');

const commands = [];
client.commands = new Collection();

// Grab all the command files from the commands directory you created earlier
const commandsPath = path.join(__dirname, 'command');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	// Set a new item in the Collection with the key as the command name and the value as the exported module
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
	} else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}

const rest = new REST().setToken(process.env.TOKEN);

(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

        const servers = require('../server.json');

        for (const server of servers) {
            // The put method is used to fully refresh all commands in the guild with the current set
            const data = await rest.put(
                Routes.applicationGuildCommands('1163790717634748497', server.ID),
                { body: commands },
            );
            console.log(`Successfully reloaded ${data.length} application (/) commands.`);
        }


	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
})();

let status = 0; // 0: normal, 1: warning, 2: danger

client.once(Events.ClientReady, async c => {
	console.log(`Ready! Logged in as ${c.user.tag}`);
    await query.getKW().then(ret => {
        let [n1, n2, xg] = ret;
        status = Number(Math.max(n1, n2, xg) >= 6500) + Number(Math.max(n1, n2, xg) >= 6750);
    })
});

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});

let check = setInterval(async () => {
    let [n1, n2, xg] = await query.getKW();
    let nowStatus = Number(Math.max(n1, n2, xg) >= 6500) + Number(Math.max(n1, n2, xg) >= 6750);
    let power = `北區一號：${n1}/5200 kW\n北區二號：${n2}/5600 kW\n仙宮一號：${xg}/1500 kW`
    console.log(status, nowStatus)
    if (status != nowStatus) {
        const servers = require('../server.json');
        for (const server of servers) {
            if (nowStatus == 0) {
                alert.send(client, server.channel, `爛清大電站用電量恢復正常，目前用電量為\n${power}`);
            }   
            else if (nowStatus == 1 && status == 0) {
                if (server.role.length > 1)
                    alert.send(client, server.channel, `<@&${server.role}> 爛清大電站用電量過高，目前用電量為\n${power}`);
                else
                    alert.send(client, server.channel, `爛清大電站用電量過高，目前發電量為\n${power}`);
            }
            else if (nowStatus == 1 && status == 2) {
                alert.send(client, server.channel, `爛清大電站用電量降回一般警戒，大家可以繼續用電腦了，目前用電量為\n${power}`);
            }
            else if (nowStatus == 2) {
                if (server.role.length > 1)
                    alert.send(client, server.channel, `<@&${server.role}> 爛清大快要停電了！目前用電量為\n${power}\n趕緊關電器！`);
                else
                    alert.send(client, server.channel, `爛清大快要停電了！目前用電量為\n${power}\n趕緊關電器`)
            }
        }
        status = nowStatus;
    }
}, 60000);


// Log in to Discord with your client's token
client.login(process.env["TOKEN"]);

