import Discord from 'discord.js';
import { mwn } from 'mwn';
import process from 'process';
import { Inject, Service } from 'typedi';
import { Scheduler } from './scheduler';

export interface MessengerOptions {
	token: string;
	channelId: string;
}

@Service()
export class Messenger {
	@Inject(() => mwn) private readonly bot: mwn;

	public discord: Discord.Client = null;
	public channel: Discord.TextChannel = null;
	private scheduler: Scheduler;

	private patchedConsole = false;

	static async init(config: MessengerOptions) {
		const messenger = new Messenger();

		if (config.token === '') return null;

		messenger.discord = await new Promise(async (resolve) => {
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

		if (messenger.discord == null) return null;

		if (config.channelId) {
			const savedChannel = await messenger.discord.channels.fetch(process.env.DISCORD_CHANNEL_ID);
			if (savedChannel instanceof Discord.TextChannel) messenger.channel = savedChannel;
		}

		if (messenger.channel == null) return null;

		messenger.patchConsole();

		return messenger;
	}

	private patchConsole() {
		if (this.patchedConsole) return;
		this.patchedConsole = true;

		if (this.discord == null || this.channel == null) return;

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
		this.scheduler = scheduler;
		const runners = this.scheduler.activeRunners.filter((runner) => runner.metadata.command);

		if (this.discord == null || this.channel == null || runners.length === 0) return;

		const channelId = process.env.DISCORD_CHANNEL_ID;

		this.discord.on('message', async (msg: Discord.Message) => {
			if (msg.author.bot || msg.channel.id !== channelId || !msg.content.startsWith('!')) return;

			const [command, ...args] = msg.content.split(/\s+/);

			if (command === '!restart') {
				await msg.reply(`\`\`\`ini\n[V] Trying to restart\n\`\`\``);
				this.scheduler.waiter.exit();
				return;
			}

			if (command === '!run') {
				const jobName = args.shift();
				if (jobName == null || jobName === '') {
					await msg.reply(
						`\`\`\`ini\n[Available Jobs]\n${runners
							.map(
								(runner) =>
									`!run ${runner.metadata.command}${runner.methodParamTypes
										.map((argType) => ` [${argType.toString()}]`)
										.join('')}`
							)
							.join('\n')}\n\`\`\``
					);
					return;
				}

				const runner = runners.find((runner) => runner.metadata.command === jobName);
				if (runner == null) {
					await msg.reply(`\`\`\`ini\n[E] Failed to run unknown job="${jobName}"\n\`\`\``);
					return;
				}
				runner.run(...args);
			}
		});
	}

	async destroy() {
		this.discord.destroy();
	}
}
