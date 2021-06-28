import 'reflect-metadata';
import process from 'process';
import { version } from '../package.json';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { mwn } from 'mwn';
import { initDiscord, initMediawiki } from './init';
import { Container } from 'typedi';
import { Instancer } from './services/instancer';
import { Scheduler } from './services/scheduler';
import { Waiter } from './services/waiter';
import { Messenger } from './services/messenger';

dotenv.config();

(async () => {
	const instancer = Container.get(Instancer);

	const canStart = await instancer.lock();
	if (!canStart) {
		mwn.log(`[V] Rukoto is already working`);
		mwn.log(`[E] The application is already running`);

		process.exit(0);
	}

	const messenger = await initDiscord();
	Container.set(Messenger, messenger);

	mwn.log(`[V] Rukoto is waking up`);

	const bot = await initMediawiki();
	Container.set(mwn, bot);

	const waiter = Container.get(Waiter);
	waiter.on('block', () => {
		mwn.log(`[V] Rukoto is waiting ${waiter.count} jobs to complete before exiting`);
		mwn.log(`[W] You can forcefully exit by exiting again`);
	});

	const scheduler = Container.get(Scheduler);
	messenger?.command(scheduler);

	mwn.log(`[V] Rukoto is working (${chalk.cyan(`version ${version}`)})`);

	process?.send?.('ready');

	if (await waiter.wait()) {
		mwn.log(`[V] Rukoto is exiting gracefully`);
	} else {
		mwn.log(`[V] Rukoto is exiting with ${chalk.red(`${chalk.bold(waiter.count)} incompleted job`)}`);
	}
	await messenger?.destroy();
	await instancer.unlock();
	process.exit(0);
})();
