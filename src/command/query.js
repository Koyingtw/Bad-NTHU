const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

let status = 0; // 0: normal, 1: warning, 2: danger

async function init() {
	let [n1, n2, xg] = await getKW();
	let nowStatus = Number(Math.max(n1, n2, xg) >= 6500) + Number(Math.max(n1, n2, xg) >= 6750);
	status = nowStatus;
	console.log("Now Status: ", status);
}

async function getKW() {
	let urls = ['http://140.114.188.57/nthu2020/fn1/kw1.aspx', 'http://140.114.188.57/nthu2020/fn1/kw2.aspx', 'http://140.114.188.57/nthu2020/fn1/kw3.aspx']
	let ret = [];
	for (let i = 0; i < 3; i++) {
		try {
			const response = await axios.get(urls[i]).then(response => {
				return response;	
			});
			const data = response.data;
		
			// 使用正規表示法取得 kW 值
			const matches = data.match(/kW: (\d[\d,]*\d+)/);
			
			if (matches && matches[1]) {
				// 移除逗號並返回結果
				ret.push(Number(matches[1].replace(/,/g, '')));				
			} else {
				console.error(`No match found: Number ${i + 1}`);
				ret.push(-1);
			}
		} catch (error) {
			console.error('Error fetching data:', error);
		}
	}
	return ret;
}

module.exports = {
	status: status,
	init: init,
	getKW: getKW,
	data: new SlashCommandBuilder()
		.setName('query')
		.setDescription('查詢爛清大電站情況'),
	async execute(interaction) { // interaction
		let [n1, n2, xg] = await getKW();

		await interaction.reply(`北區一號：${n1}/5200 kW\n北區二號：${n2}/5600 kW\n仙宮一號：${xg}/1500 kW`);
        
	},
};