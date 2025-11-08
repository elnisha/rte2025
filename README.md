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


To build the docker image we used for this project run this:
```docker run \
  --rm \
  --detach \
  --publish 8000:8000 \
  --name speaches \
  --volume hf-hub-cache:/home/ubuntu/.cache/huggingface/hub \
  ghcr.io/speaches-ai/speaches:latest-cpu```

Once running, the API will be available at http://localhost:8000.

For more details on configuration and advanced usage, see the official Speaches-AI installation guide:
https://speaches.ai/installation/￼
