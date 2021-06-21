import { mwn } from 'mwn';

export class Log {
	constructor(private label: string) {}

	success(str: string) {
		mwn.log(`[S] ${this.label} --${str}`);
	}

	info(str: string) {
		mwn.log(`[i] ${this.label} --${str}`);
	}

	verbose(str: string) {
		mwn.log(`[V] ${this.label} --${str}`);
	}

	error(str: string) {
		mwn.log(`[V] ${this.label} --${str}`);
	}
}
