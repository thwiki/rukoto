import axios, { AxiosRequestConfig } from 'axios';
import process from 'process';
import { Service } from 'typedi';

@Service()
export class Github {
	request(endpoint: string, body?: Record<string, any>, options?: AxiosRequestConfig) {
		return axios.post(`https://api.github.com/${endpoint}`, body, {
			headers: {
				Authorization: `token ${process.env.GITHUB_TOKEN}`,
				Accept: 'application/vnd.github.v3+json',
				'Content-Type': 'application/json; charset=UTF-8',
				...(options ?? {}),
			},
		});
	}
}
