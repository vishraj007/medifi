import re

def main():
    paths = [r'c:\Users\HP\TurboS-medifi\app\page.tsx']
    
    replacements = {
        r'\bDoctor\b': 'Professional',
        r'\bdoctor\b': 'professional',
        r'\bDOCTOR\b': 'PROFESSIONAL',
        r'\bPatient(?!PortalSection)\b': 'Client',
        r'\bpatient\b': 'client',
        r'\bPATIENT\b': 'CLIENT',
        r'\bpatients\b': 'clients',
        r'\bPatients\b': 'Clients'
    }

    exceptions = [
        r'href="/patient"',
        r'className="btn-patient"'
    ]

    for path in paths:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Save exceptions
        placeholder = '___EXCEPT_{}___'
        saved_exceptions = []
        for exc in exceptions:
            for match in re.finditer(exc, content):
                ph = placeholder.format(len(saved_exceptions))
                saved_exceptions.append((ph, match.group(0)))
                content = content.replace(match.group(0), ph, 1)

        # Apply replacements
        for pattern, replacement in replacements.items():
            content = re.sub(pattern, replacement, content)

        # Restore exceptions
        for ph, text in saved_exceptions:
            content = content.replace(ph, text)

        # For "existing patient or client", let's fix the resulting "existing client or client"
        content = content.replace("existing client or client", "existing client")

        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)

if __name__ == '__main__':
    main()
