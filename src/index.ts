import 'reflect-metadata';
import process from 'process';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { mwn } from 'mwn';
import { name } from '../package.json';
import { Scheduler, Waiter, Instancer } from './services';
import { initDiscord, initMediawiki } from './init';

dotenv.config();

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

	new Scheduler(bot, messenger, waiter);

	mwn.log(`[V] Rukoto is working`);

	process?.send?.('ready');

	if (await waiter.wait()) {
		mwn.log(`[V] Rukoto is exiting gracefully`);
	} else {
		mwn.log(`[V] Rukoto is exiting with ${chalk.red(`${chalk.bold(waiter.count)} incompleted job`)}`);
	}
	messenger.bot.destroy();
	await instancer.unlock();
	process.exit(0);
})();
