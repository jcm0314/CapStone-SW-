// [h] 외부 네트워크 연결 도달성 검사 (--network 옵션 지정 시에만 실행, 유료 생성 호출은 하지 않음)
import { dnsLookup, httpReq } from './lib.mjs';

export async function run(ctx, { pass, warn, skip }) {
  if (!ctx.opts.network) {
    await ctx.check({ id: 'h.network', title: '외부 연결 검사' }, async () =>
      skip('--network 옵션이 지정되지 않아 건너뜀', 'node scripts/doctor.mjs --network 로 실행하세요.')
    );
    return;
  }

  await ctx.check({ id: 'h.dns.anthropic', title: 'Anthropic Claude API DNS/TLS 도달성' }, async () => {
    const dnsRes = await dnsLookup('api.anthropic.com');
    if (dnsRes.error) {
      return warn(`DNS 조회 실패: ${dnsRes.error}`, '네트워크 또는 방화벽 설정을 확인하세요.');
    }
    const res = await httpReq('https://api.anthropic.com/', { method: 'GET', timeout: 5000 });
    if (res.error) {
      return warn(`HTTPS 연결 실패: ${res.error}`, '프록시 또는 방화벽 설정을 확인하세요.');
    }
    return pass(`도달 가능 (HTTP ${res.status}, IP: ${dnsRes.addresses.slice(0, 2).join(', ')})`);
  });
}

