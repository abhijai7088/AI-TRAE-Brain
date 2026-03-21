import os
import datetime

class Logger:
    def __init__(self, run_id):
        self.run_id = run_id
        # Set paths relative to the 'backend' directory
        self.backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.log_dir = os.path.join(self.backend_dir, "workdir", run_id)
        os.makedirs(self.log_dir, exist_ok=True)
        self.log_file = os.path.join(self.log_dir, "logs.txt")
        self.logs = []

    def log(self, message):
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        formatted_message = f"[{timestamp}] {message}"
        self.logs.append(formatted_message)
        with open(self.log_file, "a") as f:
            f.write(formatted_message + "\n")
        print(formatted_message)

    def get_logs(self):
        return self.logs
