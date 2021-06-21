import { Timezone } from 'tz-offset';

export interface JobMetadataArgs {
	trigger: string;
	command?: string;
	active?: boolean;
	timezone?: Timezone;
}
