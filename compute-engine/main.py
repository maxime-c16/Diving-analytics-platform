from flask import Flask, request, jsonify
import numpy as np

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
    # Assuming 7 judges for this MVP example as per instruction hint (though 5 is common too)
    # Instruction example: [4,4,3,7,3,7,3] -> 7 scores.
    
    sorted_scores = sorted(scores)
    
    if len(scores) == 7:
        # Drop 2 highest, 2 lowest
        valid_scores = sorted_scores[2:-2]
    elif len(scores) == 5:
        # Drop 1 highest, 1 lowest
        valid_scores = sorted_scores[1:-1]
    else:
        # Fallback or error
        valid_scores = sorted_scores # Simplified
        
    raw_total = sum(valid_scores)
    final_score = raw_total * coeff
    
    return jsonify({
        "dive_code": data.get('dive_code'),
        "valid_scores": valid_scores,
        "raw_total": raw_total,
        "final_score": final_score
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
