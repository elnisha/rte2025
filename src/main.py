import os
from backend import Fill  # Imports your core function

def run_pdf_fill_process(user_input: str, definitions: list, pdf_form_path: str):
    """
    This function is called by the frontend server.
    It receives the raw data, runs the PDF filling logic,
    and returns the path to the newly created file.
    """
    
    print("[1] Received request from frontend.")
    print(f"[2] PDF template path: {pdf_form_path}")
    
    if not os.path.exists(pdf_form_path):
        print(f"Error: PDF template not found at {pdf_form_path}")
        return None # Or raise an exception

    # 3. Run the main fill_form function from backend.py
    print("[3] Starting extraction and PDF filling process...")
    try:
        output_name = Fill.fill_form(
            user_input=user_input,
            definitions=definitions,
            pdf_form=pdf_form_path
        )
        
        print("\n----------------------------------")
        print(f"✅ Process Complete.")
        print(f"Output saved to: {output_name}")
        
        # 4. Return the path to the new file
        return output_name
        
    except Exception as e:
        print(f"An error occurred during PDF generation: {e}")
        # Re-raise the exception so the frontend can handle it
        raise e

# You no longer need an if __name__ == "__main__": block
# Your Flask/frontend server will import and call run_pdf_fill_process()

if __name__ == "__main__":
    file = "/home/juan/Documents/california/UCSC/rte2025/src/inputs/file.pdf"
    input = "Hi. The employee's name is John Doe. His job title is managing director. His department supervisor is Jane Doe. His phone number is 123456. His email is jdoe@ucsc.edu. The signature is <Mamañema>, and the date is 01/02/2005"
    descriptions = ["Employee's name", "Employee's job title", "Employee's department supervisor", "Employee's phone number", "Employee's email", "Signature", "Date"]
    run_pdf_fill_process(input, descriptions, file)
