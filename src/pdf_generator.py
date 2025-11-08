import jinja2
import subprocess
import os

class PdfGenerator:
    """
    Takes a .tex template, fills it with data,
    and compiles it to a PDF using pdflatex.
    """
    def __init__(self, template_path):
        template_dir = os.path.dirname(template_path) or '.'
        template_name = os.path.basename(template_path)
        
        self.env = jinja2.Environment(
            loader=jinja2.FileSystemLoader(template_dir),
            block_start_string='\\BLOCK{',
            block_end_string='}',
            variable_start_string='\\VAR{',
            variable_end_string='}'
        )
        
        try:
            self.template = self.env.get_template(template_name)
        except jinja2.TemplateNotFound:
            raise FileNotFoundError(f"Template not found at {template_path}")

    def generate_pdf(self, data_dict, output_filename, output_dir="."):
        """
        Renders the template with the data and compiles it.
        
        :param data_dict: The dictionary of data (from your textToJSON)
        :param output_filename: The name of the final PDF (e.g., "report.pdf")
        :param output_dir: Directory to save all files
        """
        
        filled_tex = self.template.render(data_dict)
        
        # Use a temporary name for our files
        temp_name = "temp_report"
        temp_tex_path = os.path.join(output_dir, f"{temp_name}.tex")
        final_pdf_path = os.path.join(output_dir, output_filename)

        try:
            with open(temp_tex_path, 'w', encoding='utf-8') as f:
                f.write(filled_tex)
        except IOError as e:
            print(f"Error writing temporary .tex file: {e}")
            return

        cmd = [
            'pdflatex',
            '-interaction=nonstopmode', # Don't stop on errors
            '-output-directory', output_dir,
            temp_tex_path
        ]
        
        print(f"\t[LOG]: Compiling LaTeX to PDF...")
        try:
            # We run twice to make sure cross-references (if any) are correct
            subprocess.run(cmd, check=True, capture_output=True, text=True)
            subprocess.run(cmd, check=True, capture_output=True, text=True)
            
            # 6. Rename the output PDF to the desired name
            temp_pdf_path = os.path.join(output_dir, f"{temp_name}.pdf")
            os.rename(temp_pdf_path, final_pdf_path)
            
            print(f"\t[LOG]: Successfully created {final_pdf_path}")

        except subprocess.CalledProcessError as e:
            print("--- LaTeX Compilation Failed ---")
            print("Check the .log file for details.")
            # Print the error from pdflatex
            print(e.stdout)
            print(e.stderr)
        finally:
            # 7. Clean up temporary files (.tex, .log, .aux)
            print(f"\t[LOG]: Cleaning up temp files...")
            for ext in ['.aux', '.log', '.tex']:
                try:
                    os.remove(os.path.join(output_dir, f"{temp_name}{ext}"))
                except FileNotFoundError:
                    pass
