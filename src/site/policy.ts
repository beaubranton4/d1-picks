/**
 * Publishing policy and model settings, read from the pipeline's own config
 * so the pages that describe them can never drift from what the job does.
 */
import publishing from '../../pipeline/config/publishing.json';
import volleyball from '../../pipeline/config/volleyball.json';

export const PUBLISHING = publishing;
export const VOLLEYBALL = volleyball;
