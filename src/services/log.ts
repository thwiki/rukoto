import { mwn } from 'mwn';
import { Service } from 'typedi';

@Service({ multiple: true })
export class Log {
	constructor(private readonly label: string) {}

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
