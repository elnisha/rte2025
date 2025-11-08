
class InputManager():
    def __init__(self):
        pass

    def file_to_text(self, file_path):
        content = ""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
        except FileNotFoundError:
            raise FileNotFoundError(f"File not found at {file_path}")
        except Exception as e:
            print(f"An error occurred: {e}")
        return content
