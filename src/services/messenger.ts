import Discord from 'discord.js';
import process from 'process';
import type { Scheduler } from '.';

export interface MessengerOptions {
	token: string;
	channelId: string;
}

export class Messenger {
	private patchedConsole = false;

	public bot: Discord.Client = null;
	public channel: Discord.TextChannel = null;

	static async init(config: MessengerOptions) {
		const messenger = new Messenger();

		if (config.token === '') return null;

		messenger.bot = await new Promise(async (resolve) => {
			const bot = new Discord.Client();

			bot.once('ready', () => {
				resolve(bot);
			});

			try {
				await bot.login(config.token);
			} catch (e) {
				resolve(null);
			}
		});

		if (messenger.bot == null) return null;

		if (config.channelId) {
			const savedChannel = await messenger.bot.channels.fetch(process.env.DISCORD_CHANNEL_ID);
			if (savedChannel instanceof Discord.TextChannel) messenger.channel = savedChannel;
		}

		if (messenger.channel == null) return null;

		messenger.patchConsole();

		return messenger;
	}

	constructor() {}

	private patchConsole() {
		if (this.patchedConsole) return;
		this.patchedConsole = true;

		if (this.bot == null || this.channel == null) return;

		const logs: string[] = [];
		let sendTimeout: NodeJS.Timeout = null;

		const throttleSend = () => {
			if (sendTimeout) clearTimeout(sendTimeout);
			sendTimeout = setTimeout(() => {
				while (logs.length > 0) {
					let totalLength = 0;
					let index = 0;
					while (index < logs.length) {
						const log = logs[index];
						if (totalLength + 1 + log.length > 1800) break;
						totalLength += 1 + log.length;
						index++;
					}
					this.channel.send(`\`\`\`ini\n${logs.splice(0, Math.max(index, 1)).join('\n').substr(0, 1800)}\n\`\`\``);
				}
			}, 1000);
		};

		const nativeConsoleLog = globalThis.console.log;
		globalThis.console.log = function (...args) {
			nativeConsoleLog(...args);

			for (let arg of args) {
				if (typeof arg === 'string') {
					arg = arg.replace(/\u001b\[(49|22)m/, '\x1f').replace(/\u001b[^m]*?m/g, '');
					if (typeof arg === 'string' && arg.startsWith('[') && /\u001f/.test(arg)) {
						arg = arg.replace(/"/g, "'").replace(/\u001f\s*/, '="') + '"';
					}
				} else arg = String(arg);

				logs.push(arg);
				throttleSend();
			}
		};
	}

	command(scheduler: Scheduler) {
		const runners = scheduler.activeRunners.filter((runner) => runner.metadata.command);

		if (this.bot == null || this.channel == null || runners.length === 0) return;
		const channelId = process.env.DISCORD_CHANNEL_ID;

		this.bot.on('message', (msg: Discord.Message) => {
			if (msg.channel.id !== channelId) return;

			if (msg.content === '!restart') {
				scheduler.waiter.exit();
				return;
			}
			if (msg.content === '!run') {
				msg.reply(
					`\`\`\`ini\n[Available Jobs]\n${runners
						.map(
							(runner) =>
								`!run ${runner.metadata.command}${runner.argTypes.map((argType) => ` [${argType.toString()}]`).join('')}`
						)
						.join('\n')}\n\`\`\``
				);
				return;
			}
			if (!msg.content.startsWith('!run ')) return;

			const [_, command, ...args] = msg.content.split(/\s+/);
			if (command === '') {
				msg.reply(`\`\`\`ini\n[E] Invalid job name="${command}"\n\`\`\``);
				return;
			}
			const runner = runners.find((runner) => runner.metadata.command === command);
			if (runner == null) {
				msg.reply(`\`\`\`ini\n[E] Failed to run unknown job="${command}"\n\`\`\``);
				return;
			}
			runner.run(...args);
		});
	}
}
