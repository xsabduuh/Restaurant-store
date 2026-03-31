document.getElementById("aiForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const focus = document.getElementById("focus").value.toLowerCase();
    const responseSection = document.getElementById("aiResponse");
    const suggestionList = document.getElementById("suggestionList");
    const motivationText = document.getElementById("motivationText");

    suggestionList.innerHTML = "";

    let suggestions = [];

    if (focus.includes("study") || focus.includes("coding")) {
        suggestions = [
            "Break your work into small tasks.",
            "Use focused study sessions of 45–50 minutes.",
            "Avoid social media during study time."
        ];
        motivationText.textContent = "Consistency beats motivation.";
    } 
    else if (focus.includes("health") || focus.includes("exercise")) {
        suggestions = [
            "Start with light exercise and increase gradually.",
            "Stay hydrated throughout the day.",
            "Maintain proper sleep schedule."
        ];
        motivationText.textContent = "Take care of your body, it supports your goals.";
    } 
    else {
        suggestions = [
            "Focus on one important task at a time.",
            "Plan your day before starting work.",
            "Take short breaks to refresh your mind."
        ];
        motivationText.textContent = "Small steps every day lead to big results.";
    }

    suggestions.forEach(item => {
        const li = document.createElement("li");
        li.textContent = item;
        suggestionList.appendChild(li);
    });

    responseSection.style.display = "block";
});