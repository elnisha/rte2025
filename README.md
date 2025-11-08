# Reboot the Earth - Hackathon project
Name: X

__Collaborators:__ Juan Alvarez, Manuel Carrido, Jan Sans, Marc Verges, Vincent Harkins.

Subteam: 
- Backend: Juan, Vincent, Manuel.
- Frontend: Jan, Marc.

## Notes:
Ideas for Inputs:
- Radio transcript in text of the incident (we assume it's already transcribed).
- Radio input directly from the user (firefighter).
    - initially this input will be in text.
- Initial input will be in __text__ -> to be scaled to voice later. 

## Latex requirements in different OSs:
__💻 For Windows:__
The easiest and most popular LaTeX distribution for Windows is MiKTeX.
1. Download and Install: Go to the MiKTeX website and run the installer.
2. During Installation:
    * Make sure to select the option "Install packages on-the-fly". This saves space and downloads only the packages your template needs.
    * Crucially, ensure that the installer adds the MiKTeX bin directory to your system's PATH. This is usually a checkbox in the setup wizard. If it's not in the PATH, the Python script won't be able to find pdflatex.exe.

An alternative is to install the full TeX Live distribution, but MiKTeX is often simpler for a new Windows setup.

__🍏 For macOS:__
The standard LaTeX distribution for macOS is MacTeX.
1. Download and Install: Go to the MacTeX website.
2. Install the .pkg file: MacTeX is a large download because it's the full TeX Live distribution packaged for Mac. It includes pdflatex and all common packages, so you won't run into "missing package" errors.
3. Check the PATH: The MacTeX installer automatically adds itself to your system's PATH, so after the installation, your Python script should work immediately.

For developers who use Homebrew, a lighter-weight alternative is available, but MacTeX is the most comprehensive, "it-just-works" solution.
