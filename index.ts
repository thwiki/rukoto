import 'reflect-metadata';
import process from 'process';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { mwn } from 'mwn';
import { name, version } from './package.json';
import { Scheduler, Messenger, Waiter, Instancer } from './src/services';

dotenv.config();

async function initMediawiki() {
	mwn.log(`[i] Initializing connection to THBWiki`);

	const bot = await mwn.init({
		apiUrl: 'https://thwiki.cc/api.php',

		OAuthCredentials: {
			consumerToken: process.env.CONSUMER_TOKEN,
			consumerSecret: process.env.CONSUMER_SECRET,
			accessToken: process.env.ACCESS_TOKEN,
			accessSecret: process.env.ACCESS_SECRET,
		},

		userAgent: `Rukoto ${version}`,

		defaultParams: {
			assert: 'user',
		},

		silent: false,
		retryPause: 5000,
		maxRetries: 3,
	});

	mwn.log(`[S] Connected to THBWiki`);

	return bot;
}

async function initDiscord() {
	mwn.log(`[i] Initializing connection to Discord`);
	const messenger = await Messenger.init({
		token: process.env.DISCORD_TOKEN,
		channelId: process.env.DISCORD_CHANNEL_ID,
	});
	if (messenger == null) mwn.log(`[W] Unable to connect to Discord`);
	else {
		mwn.log(`[S] Connected to Discord`);
		mwn.log(`[V] Messaging to ${messenger.channel.name}.${messenger.channel.id}`);
	}
	return messenger;
}

(async () => {
	const instancer = new Instancer(name);

	const canStart = await instancer.lock();
	if (!canStart) {
		mwn.log(`[V] Rukoto is already working`);
		mwn.log(`[E] The application is already running`);

		process.exit(0);
	}

	const messenger = await initDiscord();

	mwn.log(`[V] Rukoto is waking up`);

	const bot = await initMediawiki();

	const waiter = new Waiter();
	waiter.on('block', () => {
		mwn.log(`[V] Rukoto is waiting ${waiter.count} jobs to complete before exiting`);
		mwn.log(`[W] You can forcefully exit by exiting again`);
	});
	waiter.wait().then(async (status) => {
		if (status) {
			mwn.log(`[V] Rukoto is exiting gracefully`);
		} else {
			mwn.log(`[V] Rukoto is exiting with ${chalk.red(`${chalk.bold(waiter.count)} incompleted job`)}`);
		}
		await instancer.unlock();
		process.exit(0);
	});

	new Scheduler(bot, messenger, waiter);

	mwn.log(`[V] Rukoto is working`);

	process?.send?.('ready');
})();
