package kr.co.checkmate.server.domain.interview.entity;

import jakarta.persistence.*;
import kr.co.checkmate.server.common.domain.BaseTimeEntity;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(
        name = "interview_question_evaluations",
        indexes = {
                @Index(name = "idx_question_eval_scorecard_id", columnList = "interview_scorecard_id")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InterviewQuestionEvaluation extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "interview_scorecard_id", nullable = false)
    private InterviewScorecard interviewScorecard;

    @Column(name = "question_text", nullable = false, columnDefinition = "TEXT")
    private String questionText;

    @Column(name = "category", length = 100)
    private String category;

    @Column(name = "is_checked", nullable = false)
    private boolean checked;

    @Column(name = "score")
    private Integer score;

    @Column(name = "interviewer_note", columnDefinition = "TEXT")
    private String interviewerNote;

    @Builder
    public InterviewQuestionEvaluation(String questionText, String category,
                                       Boolean checked, Integer score, String interviewerNote) {
        this.questionText = questionText;
        this.category = category;
        this.checked = checked != null ? checked : false;
        this.score = score;
        this.interviewerNote = interviewerNote;
    }

    void assignScorecard(InterviewScorecard scorecard) {
        this.interviewScorecard = scorecard;
    }
}
