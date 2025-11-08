import json
import requests



class textToJSON():
    def __init__(self, transcript_text, target_fields, json={}):
        self.__transcript_text = transcript_text # str
        self.__target_fields = target_fields # List, contains the template field.
        self.__json = json # dictionary
        self.type_check_all()
        self.main_loop()

    
    def type_check_all(self):
        if type(self.__transcript_text) != str:
            raise TypeError(f"ERROR in textToJSON() ->\
                Transcript must be text. Input:\n\ttranscript_text: {self.__transcript_text}")
        elif type(self.__target_fields) != list:  
            raise TypeError(f"ERROR in textToJSON() ->\
                Target fields must be a list. Input:\n\ttarget_fields: {self.__target_fields}")

   
    def build_prompt(self, current_field):
        """ 
            This method is in charge of the prompt engineering. It creates a specific prompt for each target field. 
            @params: current_field -> represents the current element of the json that is being prompted.
        """
        prompt = f""" 
            SYSTEM PROMPT:
            You are an AI assistant designed to help fillout json files with information extracted from transcribed voice recordings. 
            You will receive the transcription, and the name of the JSON field whose value you have to identify in the context. Return 
            only a single string containing the identified value for the JSON field. 
            If the field name is plural, and you identify more than one possible value in the text, return both separated by a ";".
            If you don't identify the value in the provided text, return "-1".
            ---
            DATA:
            Target JSON field to find in text: {current_field}
            
            TEXT: {self.__transcript_text}
            """

        return prompt

    def main_loop(self): #FUTURE -> Refactor this to its own class
        for field in self.__target_fields:
            prompt = self.build_prompt(field)
            # print(prompt)
            ollama_url = "http://localhost:11434/api/generate"

            payload = {
                "model": "mistral",
                "prompt": prompt,
                "stream": False # don't really know why --> look into this later.
            }

            response = requests.post(ollama_url, json=payload)

            # parse response
            json_data = response.json()
            parsed_response = json_data['response']
            print(parsed_response)
            self.add_response_to_json(field, parsed_response)
            
        print("----------------------------------")
        print(json.dumps(self.__json, indent=2))
        print("--------- extracted data ---------")

        return None

    def add_response_to_json(self, field, value):
        """ 
            this method adds the following value under the specified field, 
            or under a new field if the field doesn't exist, to the json dict 
        """
        value = value.strip().replace('"', '')
        parsed_value = None

        if value == "-1":
            parsed_value = None # None is not found
        elif ";" in value: 
            parsed_value = [ elem.strip() for elem in value.split(';') ]
        else:
            parsed_value = value

        
        if field not in self.__json.keys():
            self.__json[field] = value
        else:
            self.__json[field].append(value)
        
        return

    def get_data(self):
        return self.__json


if __name__ == "__main__":
    from json_manager import JsonManager
    from input_manager import InputManager

    output_file = './src/outputs/test_output_1.json'
    input_file = './src/inputs/input.txt'
    
    input_manager = InputManager()
    text = input_manager.file_to_text(input_file)
    fields = ["reporting_officer", "incident_location", "amount_of_victims", "victim_name_s", "assisting_officer"]

    
    print("Extracting data from text...")
    t2j = textToJSON(text, fields)
    
    extracted_data = t2j.get_data()

    print(f"Saving data to {output_file}...")
    manager = JsonManager()
    manager.save_json(extracted_data, output_file)

    print("-------------- PROCESS FINISHED SUCCESSFULLY ----------------- ")
