import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PenaltyBreakdown } from './DashboardSummary';

describe('PenaltyBreakdown (감점 사유)', () => {
  it('감점 권고와 지적된 문장·사유를 보여준다', () => {
    const { getByText } = render(
      <PenaltyBreakdown
        criticReport={{
          recommendedPenalty: 8,
          flaggedQuotes: [{ quote: '열정을 다해 최고의 시너지를 발휘했습니다.', reason: '구체적 행동 없는 미사여구', severity: 'HIGH' }]
        }}
      />
    );
    expect(getByText('감점 권고 -8점')).toBeTruthy();
    expect(getByText('“열정을 다해 최고의 시너지를 발휘했습니다.”')).toBeTruthy();
    expect(getByText(/구체적 행동 없는 미사여구/)).toBeTruthy();
    expect(getByText(/단순|더한 값과는 다를 수 있습니다/)).toBeTruthy();
  });

  it('감점도 지적도 없거나 보고서가 없으면 아무것도 그리지 않는다', () => {
    expect(render(<PenaltyBreakdown criticReport={{ recommendedPenalty: 0, flaggedQuotes: [] }} />).container.innerHTML).toBe('');
    expect(render(<PenaltyBreakdown />).container.innerHTML).toBe('');
  });
});
