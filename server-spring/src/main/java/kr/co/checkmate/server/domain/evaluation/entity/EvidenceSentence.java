package kr.co.checkmate.server.domain.evaluation.entity;

import jakarta.persistence.*;
import kr.co.checkmate.server.common.domain.BaseTimeEntity;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(
        name = "evidence_sentences",
        indexes = {
                @Index(name = "idx_evidence_eval_id", columnList = "evaluation_result_id"),
                @Index(name = "idx_evidence_category", columnList = "category")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EvidenceSentence extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evaluation_result_id", nullable = false)
    private EvaluationResult evaluationResult;

    @Column(name = "category", nullable = false, length = 100)
    private String category;

    @Column(name = "sentence", nullable = false, columnDefinition = "TEXT")
    private String sentence;

    @Column(name = "quote_offset_start")
    private Integer quoteOffsetStart;

    @Column(name = "quote_offset_end")
    private Integer quoteOffsetEnd;

    @Column(name = "confidence_score")
    private Double confidenceScore;

    @Column(name = "rationale", columnDefinition = "TEXT")
    private String rationale;

    @Column(name = "interview_question", columnDefinition = "TEXT")
    private String interviewQuestion;

    @Builder
    public EvidenceSentence(String category, String sentence,
                            Integer quoteOffsetStart, Integer quoteOffsetEnd,
                            Double confidenceScore, String rationale, String interviewQuestion) {
        this.category = category;
        this.sentence = sentence;
        this.quoteOffsetStart = quoteOffsetStart;
        this.quoteOffsetEnd = quoteOffsetEnd;
        this.confidenceScore = confidenceScore != null ? confidenceScore : 1.0;
        this.rationale = rationale;
        this.interviewQuestion = interviewQuestion;
    }

    void assignEvaluationResult(EvaluationResult evaluationResult) {
        this.evaluationResult = evaluationResult;
    }
}
