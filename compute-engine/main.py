from flask import Flask, request, jsonify
import numpy as np
from scipy import stats

app = Flask(__name__)

@app.route('/compute', methods=['POST'])
def compute_score():
    data = request.json
    # Example payload: {"dive_code": "101C", "coeff": 1.2, "scores": [4, 4, 3, 7, 3, 7, 3]}
    
    scores = data.get('scores', [])
    coeff = data.get('coeff', 1.0)
    
    if not scores:
        return jsonify({"error": "No scores provided"}), 400

    # FINA Logic: Drop highest 2 and lowest 2 (for 7 judges) or highest 1 and lowest 1 (for 5 judges)
    sorted_scores = sorted(scores)
    
    if len(scores) == 7:
        # Drop 2 highest, 2 lowest
        valid_scores = sorted_scores[2:-2]
    elif len(scores) == 5:
        # Drop 1 highest, 1 lowest
        valid_scores = sorted_scores[1:-1]
    else:
        valid_scores = sorted_scores
        
    raw_total = sum(valid_scores)
    final_score = raw_total * coeff
    
    return jsonify({
        "dive_code": data.get('dive_code'),
        "valid_scores": valid_scores,
        "raw_total": raw_total,
        "final_score": final_score
    })


# ============================================
# ANALYTICS ENDPOINTS
# ============================================

@app.route('/analytics/statistics', methods=['POST'])
def calculate_statistics():
    """Calculate comprehensive statistics for a set of scores."""
    data = request.json
    scores = data.get('scores', [])
    
    if not scores or len(scores) < 2:
        return jsonify({"error": "At least 2 scores required"}), 400
    
    arr = np.array(scores)
    
    return jsonify({
        "count": len(scores),
        "mean": float(np.mean(arr)),
        "median": float(np.median(arr)),
        "std": float(np.std(arr, ddof=1)),
        "variance": float(np.var(arr, ddof=1)),
        "min": float(np.min(arr)),
        "max": float(np.max(arr)),
        "range": float(np.max(arr) - np.min(arr)),
        "q1": float(np.percentile(arr, 25)),
        "q3": float(np.percentile(arr, 75)),
        "iqr": float(np.percentile(arr, 75) - np.percentile(arr, 25)),
        "skewness": float(stats.skew(arr)),
        "kurtosis": float(stats.kurtosis(arr))
    })


@app.route('/analytics/judge-consistency', methods=['POST'])
def analyze_judge_consistency():
    """Analyze scoring consistency across judges."""
    data = request.json
    dives = data.get('dives', [])
    
    if not dives:
        return jsonify({"error": "No dives provided"}), 400
    
    # Extract judge scores into columns
    num_judges = len(dives[0].get('judgeScores', []))
    judge_scores = {i: [] for i in range(num_judges)}
    
    for dive in dives:
        scores = dive.get('judgeScores', [])
        for i, score in enumerate(scores):
            if i < num_judges:
                judge_scores[i].append(score)
    
    # Calculate per-judge statistics
    judges = []
    all_stds = []
    
    for i in range(num_judges):
        scores = judge_scores[i]
        if scores:
            std = float(np.std(scores, ddof=1)) if len(scores) > 1 else 0
            all_stds.append(std)
            judges.append({
                "judgeIndex": i,
                "mean": float(np.mean(scores)),
                "std": std,
                "min": float(np.min(scores)),
                "max": float(np.max(scores)),
                "consistency": "high" if std < 0.5 else ("medium" if std < 1.0 else "low")
            })
    
    overall_std = float(np.mean(all_stds)) if all_stds else 0
    
    return jsonify({
        "judges": judges,
        "overallStd": overall_std,
        "numDives": len(dives),
        "consistency": "high" if overall_std < 0.5 else ("medium" if overall_std < 1.0 else "low")
    })


@app.route('/analytics/predict-score', methods=['POST'])
def predict_score():
    """Predict score based on historical performance."""
    data = request.json
    historical_scores = data.get('historicalScores', [])
    difficulty = data.get('difficulty', 1.0)
    
    if not historical_scores or len(historical_scores) < 3:
        return jsonify({"error": "At least 3 historical scores required"}), 400
    
    arr = np.array(historical_scores)
    mean = float(np.mean(arr))
    std = float(np.std(arr, ddof=1))
    
    # Simple linear trend
    x = np.arange(len(arr))
    slope, intercept, r_value, p_value, std_err = stats.linregress(x, arr)
    
    # Predict next score
    predicted = intercept + slope * len(arr)
    confidence = min(0.95, max(0.5, abs(r_value)))
    
    # Determine trend
    if slope > 0.5:
        trend = "improving"
    elif slope < -0.5:
        trend = "declining"
    else:
        trend = "stable"
    
    return jsonify({
        "predictedScore": float(predicted),
        "confidence": float(confidence),
        "lowerBound": float(predicted - 1.96 * std),
        "upperBound": float(predicted + 1.96 * std),
        "trend": trend,
        "historicalMean": mean,
        "historicalStd": std
    })


@app.route('/analytics/competition-insights', methods=['POST'])
def competition_insights():
    """Generate competition insights and rankings."""
    data = request.json
    athletes = data.get('athletes', [])
    
    if not athletes:
        return jsonify({"error": "No athletes provided"}), 400
    
    results = []
    for athlete in athletes:
        scores = athlete.get('scores', [])
        if scores:
            arr = np.array(scores)
            results.append({
                "id": athlete.get('id'),
                "name": athlete.get('name'),
                "totalScore": float(np.sum(arr)),
                "averageScore": float(np.mean(arr)),
                "bestScore": float(np.max(arr)),
                "worstScore": float(np.min(arr)),
                "consistency": float(np.std(arr, ddof=1)) if len(arr) > 1 else 0,
                "numDives": len(scores)
            })
    
    # Sort by total score descending
    results.sort(key=lambda x: x['totalScore'], reverse=True)
    
    # Add rankings
    for i, r in enumerate(results):
        r['rank'] = i + 1
    
    return jsonify({
        "rankings": results,
        "totalAthletes": len(results),
        "leader": results[0] if results else None
    })


@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "compute-engine"})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
