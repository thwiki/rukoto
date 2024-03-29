import { mwn } from 'mwn';
import { version } from '../package.json';
import { Messenger } from './services/messenger';

export async function initMediawiki() {
	mwn.log(`[i] Initializing connection to THBWiki`);

	const bot = await mwn
		.init({
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
		})
		.catch((err) => {
			console.log(err);
			throw err;
		});

	mwn.log(`[S] Connected to THBWiki`);

	return bot;
}

export async function initDiscord() {
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
