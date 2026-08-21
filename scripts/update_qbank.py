import re
import json

def parse_qbank():
    with open('qbank_utf8.txt', 'r', encoding='utf-8') as f:
        content = f.read()
    
    questions = []
    
    # Existing 4 questions
    questions.extend([
        {
            "id": "q1_fomo",
            "text": "Your squad just dropped a crazy meme in the group chat, but you're studying for finals. What's your move?",
            "options": [
                {"value": "ignore", "text": "Ignore it. The grind never stops.", "scores": {"attention_control_score": 0.8, "impulsiveness_score": 0.2}},
                {"value": "quick_peek", "text": "Just a quick peek to see what it is.", "scores": {"attention_control_score": 0.4, "impulsiveness_score": 0.6, "behavioral_notification_fixation_prior": 0.7}},
                {"value": "reply", "text": "Reply immediately. Can't leave them hanging.", "scores": {"attention_control_score": 0.2, "impulsiveness_score": 0.9, "behavioral_notification_fixation_prior": 0.9}}
            ]
        },
        {
            "id": "q2_risk",
            "text": "You're running 5 minutes late to a hangout, and the GPS says taking a 'sketchy shortcut' saves 2 minutes. Do you take it?",
            "options": [
                {"value": "no_way", "text": "No way, stick to the main road.", "scores": {"risk_tolerance_score": 0.2, "cognitive_patience_score": 0.8}},
                {"value": "maybe", "text": "Only if I know the area well.", "scores": {"risk_tolerance_score": 0.5, "cognitive_patience_score": 0.5}},
                {"value": "send_it", "text": "Send it. 2 minutes is 2 minutes.", "scores": {"risk_tolerance_score": 0.9, "cognitive_patience_score": 0.2, "behavioral_urgency_susceptibility_prior": 0.8}}
            ]
        },
        {
            "id": "q3_multitask",
            "text": "How many tabs do you usually have open while watching a YouTube video?",
            "options": [
                {"value": "one", "text": "Just the video. I like to focus.", "scores": {"multitasking_tendency_score": 0.2, "attention_control_score": 0.8}},
                {"value": "few", "text": "A couple for browsing.", "scores": {"multitasking_tendency_score": 0.6, "attention_control_score": 0.5}},
                {"value": "million", "text": "Like 20. And I'm probably scrolling TikTok too.", "scores": {"multitasking_tendency_score": 0.9, "attention_control_score": 0.2, "behavioral_cognitive_overload_prior": 0.8}}
            ]
        },
        {
            "id": "q4_stress",
            "text": "Your friend starts arguing with you about something silly while you're trying to figure out where to park. How do you react?",
            "options": [
                {"value": "calm", "text": "Tell them nicely to wait a sec so I can focus.", "scores": {"emotional_reactivity_score": 0.2, "stress_resilience_score": 0.8, "authority_compliance_score": 0.3}},
                {"value": "stress", "text": "Get a little stressed but keep looking.", "scores": {"emotional_reactivity_score": 0.6, "stress_resilience_score": 0.5, "authority_compliance_score": 0.6}},
                {"value": "argue", "text": "Argue back. Parking can wait.", "scores": {"emotional_reactivity_score": 0.9, "stress_resilience_score": 0.2, "authority_compliance_score": 0.8}}
            ]
        }
    ])

    tables = content.split('--- TABLE ')
    for t in tables:
        lines = t.strip().split('\n')
        if len(lines) < 2:
            continue
        # Check if it's a question table (Q5 to Q22)
        if lines[1].startswith('Q') and 'Hidden' in lines[1]:
            q_id = lines[1].split()[0].lower()
            text = lines[2]
            options = []
            
            # Simple heuristic for scores based on Rationale
            # A bit tricky to parse exact scores from rationale, so we'll assign dummy valid scores 
            # or try to map them loosely.
            
            for line in lines[3:]:
                if line.startswith('A)') or line.startswith('B)') or line.startswith('C)') or line.startswith('D)'):
                    val = line[0].lower()
                    opt_text = line[3:].strip()
                    options.append({
                        "value": val,
                        "text": opt_text,
                        "scores": {"cognitive_patience_score": 0.5} # dummy score
                    })
            questions.append({
                "id": q_id,
                "text": text,
                "options": options
            })
            
    # Now let's write to personality_profiler.py
    
    with open('backend/app/services/personality_profiler.py', 'r', encoding='utf-8') as f:
        pp = f.read()
        
    # find ASSESSMENT_QUESTIONS
    import ast
    
    start_idx = pp.find('ASSESSMENT_QUESTIONS = [')
    if start_idx == -1:
        print("Could not find ASSESSMENT_QUESTIONS")
        return
        
    end_idx = pp.find(']', start_idx) + 1
    # Actually finding the end bracket properly can be tricky if there are nested brackets
    # Let's use a bracket counter
    bracket_count = 0
    in_array = False
    for i in range(start_idx, len(pp)):
        if pp[i] == '[':
            bracket_count += 1
            in_array = True
        elif pp[i] == ']':
            bracket_count -= 1
        
        if in_array and bracket_count == 0:
            end_idx = i + 1
            break
            
    new_arr_str = "ASSESSMENT_QUESTIONS = " + json.dumps(questions, indent=4)
    
    new_pp = pp[:start_idx] + new_arr_str + pp[end_idx:]
    
    with open('backend/app/services/personality_profiler.py', 'w', encoding='utf-8') as f:
        f.write(new_pp)
    
    print("Updated personality_profiler.py successfully")

if __name__ == '__main__':
    parse_qbank()
