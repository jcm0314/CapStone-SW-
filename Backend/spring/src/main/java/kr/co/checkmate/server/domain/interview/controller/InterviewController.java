package kr.co.checkmate.server.domain.interview.controller;

import jakarta.validation.Valid;
import kr.co.checkmate.server.common.response.ApiResponse;
import kr.co.checkmate.server.domain.interview.dto.InterviewScorecardResponse;
import kr.co.checkmate.server.domain.interview.dto.InterviewScorecardSubmitRequest;
import kr.co.checkmate.server.domain.interview.dto.InterviewSummaryResponse;
import kr.co.checkmate.server.domain.interview.service.InterviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tenants/{tenantId}/applicants/{applicantId}/interviews")
@RequiredArgsConstructor
public class InterviewController {

    private final InterviewService interviewService;

    @PostMapping
    public ResponseEntity<ApiResponse<InterviewScorecardResponse>> submitScorecard(
            @PathVariable UUID tenantId,
            @PathVariable UUID applicantId,
            @Valid @RequestBody InterviewScorecardSubmitRequest request
    ) {
        InterviewScorecardResponse response = interviewService.submitScorecard(tenantId, applicantId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<InterviewSummaryResponse>> getInterviewSummary(
            @PathVariable UUID tenantId,
            @PathVariable UUID applicantId
    ) {
        InterviewSummaryResponse response = interviewService.getInterviewSummary(tenantId, applicantId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
