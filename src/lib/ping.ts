import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface PingResult {
  ip: string;
  isOnline: boolean;
  responseTime?: number;
}

export async function pingIP(ip: string): Promise<PingResult> {
  try {
    const { stdout } = await execAsync(`ping -n 1 -w 1000 ${ip}`);
    console.log(`Ping result for ${ip}:`, stdout.substring(0, 200));
    const isOnline = stdout.includes('TTL') || stdout.includes('bytes from');
    
    let responseTime: number | undefined;
    const timeMatch = stdout.match(/time[=<](\d+)ms/);
    if (timeMatch) {
      responseTime = parseInt(timeMatch[1]);
    }

    return {
      ip,
      isOnline,
      responseTime,
    };
  } catch (error) {
    console.log(`Ping failed for ${ip}:`, error);
    return {
      ip,
      isOnline: false,
    };
  }
}

export async function pingIPRange(baseIP: string): Promise<PingResult[]> {
  const results: PingResult[] = [];
  const parts = baseIP.split('.');

  for (let i = 1; i <= 254; i++) {
    const ip = `${parts[0]}.${parts[1]}.${parts[2]}.${i}`;
    const result = await pingIP(ip);
    results.push(result);
  }

  return results;
}

export async function ping17218Range(): Promise<PingResult[]> {
  const results: PingResult[] = [];

  for (let thirdOctet = 0; thirdOctet <= 255; thirdOctet++) {
    for (let fourthOctet = 1; fourthOctet <= 254; fourthOctet++) {
      const ip = `172.18.${thirdOctet}.${fourthOctet}`;
      const result = await pingIP(ip);
      results.push(result);
    }
  }

  return results;
}

export async function pingSpecificIPs(ips: string[]): Promise<PingResult[]> {
  const results = await Promise.all(ips.map(ip => pingIP(ip)));
  return results;
}
