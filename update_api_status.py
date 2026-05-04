import sys

def update_file():
    with open(r'inventory_model_secondary\src\api_production.py', 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    new_lines = []
    in_retrain = False
    
    for line in lines:
        if line.startswith('@app.post("/retrain")'):
            new_lines.append('''
# Global training status
global_training_status = {
    "status": "idle",
    "progress": 0,
    "message": "Ready"
}

@app.get("/training-status")
def get_training_status():
    return global_training_status

''')
            new_lines.append(line)
        elif line.strip() == 'def retrain():':
            new_lines.append(line)
            new_lines.append('    global global_training_status\n')
            new_lines.append('    global_training_status.update({"status": "training", "progress": 5, "message": "Starting retraining pipeline..."})\n')
            in_retrain = True
        elif in_retrain and line.strip() == 'for step_name, script_args in scripts:':
            new_lines.append('    total_scripts = len(scripts)\n')
            new_lines.append('    for i, (step_name, script_args) in enumerate(scripts):\n')
            new_lines.append('        progress_pct = 10 + int(70 * (i / max(1, total_scripts)))\n')
            new_lines.append('        global_training_status.update({"progress": progress_pct, "message": f"Running {step_name}..."})\n')
        elif in_retrain and line.strip() == 'return {"status": "error", "error": f"Failed during {step_name}", "details": error_msg}':
            new_lines.append('            global_training_status.update({"status": "error", "message": f"{step_name} failed."})\n')
            new_lines.append(line)
        elif in_retrain and line.strip() == '# Reload the model in the forecaster':
            new_lines.append('    global_training_status.update({"progress": 90, "message": "Reloading model..."})\n')
            new_lines.append(line)
        elif in_retrain and line.strip() == 'return {"status": "error", "error": f"Model trained but failed to reload: {str(e)}"}':
            new_lines.append('        global_training_status.update({"status": "error", "message": "Failed to reload model."})\n')
            new_lines.append(line)
        elif in_retrain and line.strip() == 'return {': # end of retrain returns
            new_lines.append('    global_training_status.update({"status": "completed", "progress": 100, "message": "Training complete!"})\n')
            new_lines.append(line)
            in_retrain = False
        else:
            if in_retrain and 'for step_name, script_args in scripts:' in line:
                continue
            new_lines.append(line)

    with open(r'inventory_model_secondary\src\api_production.py', 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

update_file()
print('Updated api_production.py')
