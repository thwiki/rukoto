import fs from 'fs';
import net from 'net';
import os from 'os';
import path from 'path';

export interface InstancerOptions {
	socketPath?: string;
}

export class Instancer {
	public name: string;
	public options: InstancerOptions;
	private socketPath: string;
	private server: net.Server;

	constructor(appName: string, options?: InstancerOptions) {
		this.name = appName;
		this.options = options ?? {};
		this.socketPath =
			this.options.socketPath ??
			(process.platform == 'win32' ? '\\\\.\\pipe\\' + appName + '-sock' : path.join(os.tmpdir(), appName + '.sock'));
		this.server = null;
	}

	lock() {
		return new Promise<boolean>((resolve) => {
			const client = net.connect({ path: this.socketPath }, () => {
				client.write('connectionAttempt', () => {
					resolve(false);
				});
			});

			client.on('error', (err) => {
				try {
					fs.unlinkSync(this.socketPath);
				} catch (e) {
					if (e.code !== 'ENOENT') throw e;
				}
				this.server = net.createServer();
				resolve(true);
				this.server.listen(this.socketPath);
				this.server.on('error', (err) => {
					resolve(false);
				});
			});
		});
	}

	unlock() {
		return new Promise<boolean>((resolve) => {
			if (this.server) {
				this.server.close((err) => {
					resolve(!err);
				});
			} else {
				resolve(true);
			}
		});
	}
}
