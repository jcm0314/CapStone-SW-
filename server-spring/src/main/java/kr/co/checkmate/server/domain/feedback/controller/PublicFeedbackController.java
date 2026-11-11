package kr.co.checkmate.server.domain.feedback.controller;

import kr.co.checkmate.server.common.response.ApiResponse;
import kr.co.checkmate.server.domain.feedback.dto.PublicFeedbackReportResponse;
import kr.co.checkmate.server.domain.feedback.service.FeedbackService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/public/feedback")
@RequiredArgsConstructor
public class PublicFeedbackController {

    private final FeedbackService feedbackService;

    @GetMapping("/{feedbackToken}")
    public ResponseEntity<ApiResponse<PublicFeedbackReportResponse>> getPublicFeedback(
            @PathVariable String feedbackToken
    ) {
        PublicFeedbackReportResponse response = feedbackService.getPublicFeedbackReport(feedbackToken);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
