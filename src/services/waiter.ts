import { EventEmitter } from 'events';

const ExitEvent = Symbol('exit');

export class Waiter extends EventEmitter {
	private _count = 0;
	private exited = false;
	private waited = false;

	private handleCount = (count: number) => {
		if (count < 0) {
			this._count = 0;
			return false;
		}
		this._count = count;
		if (this.exited && this._count === 0) {
			this.handleExit();
		}
		return true;
	};

	private handleExit = () => {
		if (this.exited && this._count > 0) {
			this.emit(ExitEvent, false);
		} else {
			this.exited = true;
			if (this._count === 0) this.emit(ExitEvent, true);
			else {
				this.emit('block');
			}
		}
	};

	add(delta = 1): boolean {
		return this.exited ? false : this.handleCount(this._count + delta);
	}

	done(): boolean {
		return this.handleCount(this._count - 1);
	}

	exit() {
		this.handleExit();
	}

	get count() {
		return this._count;
	}

	wait() {
		if (this.waited) throw new Error('ExitWait.wait can only be called once');
		this.waited = true;
		return new Promise<boolean>((resolve) => {
			this.on(ExitEvent, (ok: boolean) => {
				resolve(ok);
			});
			process.on('SIGINT', this.handleExit);
			process.on('SIGQUIT', this.handleExit);
			process.on('SIGKILL', this.handleExit);
			process.on('SIGTERM', this.handleExit);
		});
	}
}
