# CSCI_3308_Project

# News Website Project: Stay Informed, Stay Engaged 

<<<<<<< HEAD
# News Website Project: Stay Informed, Stay Engaged 

## Your Personalized Hub for News and Updates 
=======
##  Your Personalized Hub for News and Updates 
>>>>>>> 4267a075c7b536aa0c7c39b8e0687ed2baeeb79b

The **News Website Project** offers a modern platform designed to make staying informed easy and engaging. Users can create secure accounts, personalize their experience, and access curated news content all in one place.

Features include:

* **User Accounts:** Sign up, log in securely, and personalize your news feed.
* **Article Browsing:** Explore a variety of news articles tailored to your interests.
* **Interactive Experience:** Like articles, post messages, and engage with the community.
* **Secure Authentication:** Passwords are securely hashed to protect user data.
* **Scalable Infrastructure:** The entire project is containerized with Docker for easy deployment and scalability.
<<<<<<< HEAD


---
=======
>>>>>>> 4267a075c7b536aa0c7c39b8e0687ed2baeeb79b

##  Team Members

> * Ro, J.Ro – [jonathan.ro@colorado.edu](mailto:jonathan.ro@colorado.edu)
> * Haces Febre, Santiago – [santiago.hacesfebre@colorado.edu](mailto:santiago.hacesfebre@colorado.edu)
> * Basnet, Sujay – [sujay.basnet@colorado.edu](mailto:sujay.basnet@colorado.edu)
> * Pathak, Shivam – [shivam.pathak-1@colorado.edu](mailto:shivam.pathak-1@colorado.edu)

##  Technology Stack

> * **Frontend:** HTML, CSS, JavaScript
> * **Backend:** Node.js, Express
> * **Database:** PostgreSQL
> * **Containerization:** Docker, Docker Compose

## Prerequisites to Run the App

> * Docker and Docker Compose
> * Node.js and npm (for manual development use)
> * PostgreSQL (optional, handled by Docker in standard setup)

##  Instructions to Run Locally

1. Clone the repository:

   ```bash
   git clone <REPO_URL_HERE>
   ```

2. Navigate to the project source directory:

   ```bash
   cd <repo-folder>/ProjectSourceCode
   ```

3. Create an `.env` file:

   ```bash
   touch .env
   ```

4. Add the following to your `.env` file:

   ```ini
   POSTGRES_HOST='db'
   POSTGRES_DB='users_db'
   POSTGRES_USER='postgres'
   POSTGRES_PASSWORD='pwd'
   SESSION_SECRET='<SET_YOUR_SECRET>'
   ```

5. Ensure your SQL initialization files are ready:

   * Located in `/src/init_data/`, adjust as needed for your schema and data.

6. Build and run the application with Docker:

   ```bash
   docker compose up
   ```

The application backend and database will start together in containers.

##  Testing

> Tests can be run using:
>
> ```bash
> npm test
> ```
>
> Automated tests may also run on container startup, depending on configuration.


##  Future Improvements

* Integration with real-time news APIs or AI-generated content
* Enhanced personalization and filtering features
* Community messaging and expanded engagement tools



