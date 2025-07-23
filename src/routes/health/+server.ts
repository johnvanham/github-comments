import { json } from '@sveltejs/kit';

export async function GET(event) {
	const timestamp = new Date().toISOString();
	const clientIP = event.getClientAddress();

	console.log(`[${timestamp}] Health check - IP: ${clientIP}`);

	return json({
		status: 'healthy',
		timestamp,
		uptime: process.uptime(),
		environment: process.env.NODE_ENV || 'development'
	});
}
