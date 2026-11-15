package kr.co.checkmate.server.domain.feedback.controller;

import jakarta.validation.Valid;
import kr.co.checkmate.server.common.response.ApiResponse;
import kr.co.checkmate.server.domain.feedback.dto.FeedbackReportCreateRequest;
import kr.co.checkmate.server.domain.feedback.dto.FeedbackReportResponse;
import kr.co.checkmate.server.domain.feedback.service.FeedbackService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tenants/{tenantId}/applicants/{applicantId}/feedback")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;

    @PostMapping
    public ResponseEntity<ApiResponse<FeedbackReportResponse>> createFeedbackReport(
            @PathVariable UUID tenantId,
            @PathVariable UUID applicantId,
            @Valid @RequestBody FeedbackReportCreateRequest request
    ) {
        FeedbackReportResponse response = feedbackService.createOrUpdateFeedbackReport(tenantId, applicantId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<FeedbackReportResponse>> getFeedbackReport(
            @PathVariable UUID tenantId,
            @PathVariable UUID applicantId
    ) {
        FeedbackReportResponse response = feedbackService.getFeedbackReport(tenantId, applicantId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/send")
    public ResponseEntity<ApiResponse<FeedbackReportResponse>> sendFeedbackReport(
            @PathVariable UUID tenantId,
            @PathVariable UUID applicantId
    ) {
        FeedbackReportResponse response = feedbackService.markFeedbackAsSent(tenantId, applicantId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
