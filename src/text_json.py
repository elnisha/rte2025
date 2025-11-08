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
            You are an AI data extractor. You will be given text and a field name.
            Your ONLY job is to extract the value for that field from the text.
            Return ONLY the extracted value and NOTHING else.
            Do not add explanations. Do not repeat the field name.
            
            If the field name is plural (e.g., ends in 's'), and you identify more than one value, return them separated by a ";".
            If you don't identify the value, return "-1".
            ---
            
            DATA:
            Target field: {current_field}
            
            TEXT: {self.__transcript_text}
            
            EXTRACTED VALUE:
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
            # print(parsed_response)
            self.add_response_to_json(field, parsed_response)
            
        print("----------------------------------")
        print("\t[LOG] Resulting JSON created from the input text:")
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
        plural = False
 
        if value != "-1":
            parsed_value = value       
        
        if ";" in value:
            parsed_value = self.handle_plural_values(value)
            plural = True


        if field in self.__json.keys():
            self.__json[field].append(parsed_value)
        else: 
            self.__json[field] = parsed_value
                
        return

    def handle_plural_values(self, plural_value):
        """ 
            This method handles plural values.
            Takes in strings of the form 'value1; value2; value3; ...; valueN' 
            returns a list with the respective values -> [value1, value2, value3, ..., valueN]
        """
        if ";" not in plural_value:
            raise ValueError(f"Value is not plural, doesn't have ; separator, Value: {plural_value}")
        
        print(f"\t[LOG]: Formating plural values for JSON, [For input {plural_value}]...")
        values = plural_value.split(";")
        
        # Remove trailing leading whitespace
        for i in range(len(values)):
            current = i+1 
            if current < len(values):
                clean_value = values[current].lstrip()
                values[current] = clean_value

        print(f"\t[LOG]: Resulting formatted list of values: {values}")
        
        return values
        

    def get_data(self):
        return self.__json


if __name__ == "__main__":
    from json_manager import JsonManager
    from input_manager import InputManager
    from pdf_generator import PdfGenerator

    output_file = './src/outputs/test_output_1.json'
    input_file = './src/inputs/input.txt'
    template_file = './src/tex/template.tex'
    output_pdf_file = 'IncidentReport.pdf'
    
    input_manager = InputManager()
    text = input_manager.file_to_text(input_file)
    fields = ["reporting_officer", "incident_location", "amount_of_victims", "victim_name_s", "assisting_officer"]

    
    print("Extracting data from text...")
    t2j = textToJSON(text, fields)
    
    extracted_data = t2j.get_data()

    print(f"Saving data to {output_file}...")
    manager = JsonManager()
    manager.save_json(extracted_data, output_file)

    # Generate pdf file
    print(f'Generating PDF file report in {output_pdf_file}')
    pdf_gen = PdfGenerator(template_path=template_file)
    pdf_gen.generate_pdf(extracted_data, output_pdf_file, output_dir='./src/outputs')


    print("-------------- PROCESS FINISHED SUCCESSFULLY ----------------- ")
