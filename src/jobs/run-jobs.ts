import { mwn } from 'mwn';
import { Job, Param } from '../decorators';
import { Log, Token } from '../services';

interface MediawikiJobStatus {
	jobs: MediawikiJob[];
	reached: 'none-ready' | 'none-possible' | 'read-only' | 'replica-lag-limit' | 'job-limit' | 'time-limit' | 'memory-limit';
	backoffs?: Record<string, number> | [];
	elapsed?: number;
}

interface MediawikiJob {
	type: string;
	status: 'ok' | 'failed';
	error: string | null;
	time: number;
}

@Job({
	trigger: '0 * * * *',
	command: 'run-jobs',
	active: true,
})
export class RunJobsJob {
	constructor(private bot: mwn, private log: Log, private token: Token) {}

	async run(@Param({ name: 'maxJobs', type: 'int', min: 0, max: 1000 }) maxJobs: number = 1000) {
		let pendingJobs: number =
			(
				await this.bot.request({
					action: 'query',
					meta: 'siteinfo',
					siprop: 'statistics',
				})
			).query?.statistics?.jobs ?? 0;

		if (pendingJobs === 1) return false;

		let jobs = Math.min(maxJobs, pendingJobs);
		this.log.verbose(`queued to do ${jobs} out of ${pendingJobs} pending jobs (max: ${maxJobs})`);

		const token = await this.token.get('maintenance');

		while (jobs-- > 0) {
			try {
				const result = (
					await this.bot.request({
						action: 'maintenance',
						script: 'run-jobs',
						token,
					})
				)?.maintenance;
				const status: MediawikiJobStatus = JSON.parse(result);
				status?.jobs?.forEach((job) => {
					if (job.status !== 'ok') this.log.verbose(`failed job: ${job.type} (${job.status}@${job.time}ms)`);
				});
				if (status.reached !== 'job-limit') {
					this.log.verbose(`reached ${status.reached}`);
					break;
				}
			} catch (e: unknown) {
				break;
			}
		}

		return true;
	}
}
