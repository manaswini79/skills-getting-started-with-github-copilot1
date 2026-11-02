document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  function showMessage(message, type) {
    messageDiv.textContent = message;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function updateAvailability(activityCard, change) {
    const availabilityCount = activityCard.querySelector(".availability-count");
    const spotsLeft = Number(availabilityCount.dataset.spotsLeft) + change;
    availabilityCount.dataset.spotsLeft = spotsLeft;
    availabilityCount.textContent = `${spotsLeft} spots left`;
  }

  function createParticipantItem(activityName, email) {
    const participant = document.createElement("li");
    participant.className = "participant-item";

    const participantEmail = document.createElement("span");
    participantEmail.textContent = email;
    participant.appendChild(participantEmail);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "participant-delete-button";
    deleteButton.setAttribute("aria-label", `Unregister ${email} from ${activityName}`);
    deleteButton.title = `Unregister ${email}`;
    deleteButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3" />
      </svg>
    `;
    deleteButton.addEventListener("click", async () => {
      deleteButton.disabled = true;

      try {
        const response = await fetch(
          `/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`,
          { method: "DELETE" }
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.detail || "Could not unregister participant");
        }

        const activityCard = participant.closest(".activity-card");
        const participantsList = participant.parentElement;
        participant.remove();

        if (participantsList.children.length === 0) {
          const emptyMessage = document.createElement("li");
          emptyMessage.className = "no-participants";
          emptyMessage.textContent = "No participants yet";
          participantsList.appendChild(emptyMessage);
        }

        updateAvailability(activityCard, 1);
        showMessage(result.message, "success");
      } catch (error) {
        console.error("Error unregistering participant:", error);
        showMessage(error.message || "Failed to unregister participant. Please try again.", "error");
        deleteButton.disabled = false;
      }
    });

    participant.appendChild(deleteButton);
    return participant;
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        activityCard.dataset.activityName = name;

        const spotsLeft = details.max_participants - details.participants.length;

        const title = document.createElement("h4");
        title.textContent = name;
        activityCard.appendChild(title);

        const description = document.createElement("p");
        description.textContent = details.description;
        activityCard.appendChild(description);

        const schedule = document.createElement("p");
        schedule.innerHTML = "<strong>Schedule:</strong> ";
        schedule.append(document.createTextNode(details.schedule));
        activityCard.appendChild(schedule);

        const availability = document.createElement("p");
        availability.innerHTML = "<strong>Availability:</strong> ";
        const availabilityCount = document.createElement("span");
        availabilityCount.className = "availability-count";
        availabilityCount.dataset.spotsLeft = spotsLeft;
        availabilityCount.textContent = `${spotsLeft} spots left`;
        availability.appendChild(availabilityCount);
        activityCard.appendChild(availability);

        const participantsHeading = document.createElement("h5");
        participantsHeading.className = "participants-heading";
        participantsHeading.textContent = "Participants";
        activityCard.appendChild(participantsHeading);

        const participantsList = document.createElement("ul");
        participantsList.className = "participant-list";
        details.participants.forEach((email) => {
          participantsList.appendChild(createParticipantItem(name, email));
        });

        if (details.participants.length === 0) {
          const emptyMessage = document.createElement("li");
          emptyMessage.className = "no-participants";
          emptyMessage.textContent = "No participants yet";
          participantsList.appendChild(emptyMessage);
        }

        activityCard.appendChild(participantsList);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        const activityCard = [...activitiesList.children].find(
          (card) => card.dataset.activityName === activity
        );
        const participantsList = activityCard?.querySelector(".participant-list");
        const emptyMessage = participantsList?.querySelector(".no-participants");
        emptyMessage?.remove();

        if (participantsList) {
          participantsList.appendChild(createParticipantItem(activity, email));
        }

        if (activityCard) {
          updateAvailability(activityCard, -1);
        }

        showMessage(result.message, "success");
        signupForm.reset();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }

    } catch (error) {
      console.error("Error signing up:", error);
      showMessage("Failed to sign up. Please try again.", "error");
    }
  });

  // Initialize app
  fetchActivities();
});
