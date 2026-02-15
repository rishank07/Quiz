let correctTotal = 0;
let wrongTotal = 0;
let attempted = 0;

function checkAnswer(qid) {
    const qBox = document.getElementById('q' + qid);
    // If the question has already been answered, do nothing
    if (qBox.classList.contains('answered')) return;

    const optionsDiv = qBox.querySelector('.options');
    const correct = optionsDiv.getAttribute('data-correct'); // Gets 'a', 'b', 'c', 'd', or '*'
    const selected = qBox.querySelector('input[name="q' + qid + '"]:checked');

    // Validation: Check if an option is selected
    if (!selected) {
        alert('Please select an option / कृपया एक विकल्प चुनें');
        return;
    }

    qBox.classList.add('answered');
    const selectedVal = selected.value;
    const labels = qBox.querySelectorAll('.option-label');

    // Special Handling for Disputed/None True Questions (*)
    if (correct === '*') {
        // If data-correct is '*', mark ALL options as wrong (red)
        labels.forEach(label => {
            label.classList.add('wrong');
            label.querySelector('input').disabled = true;
        });
        wrongTotal++; // Count as wrong since no correct option existed
    } 
    else {
        // Standard Scoring Logic
        labels.forEach(label => {
            const radio = label.querySelector('input');
            
            // Highlight the correct answer (Green)
            if (radio.value === correct) {
                label.classList.add('correct');
            }
            
            // Highlight the user's wrong selection (Red)
            if (radio.value === selectedVal && selectedVal !== correct) {
                label.classList.add('wrong');
            }
            
            // Disable all radio buttons after selection
            radio.disabled = true;
        });

        // Update Score Counters
        if (selectedVal === correct) {
            correctTotal++;
        } else {
            wrongTotal++;
        }
    }

    attempted++;

    // Update the Score Bar UI
    document.getElementById('totalAttempted').textContent = attempted;
    document.getElementById('correctCount').textContent = correctTotal;
    document.getElementById('wrongCount').textContent = wrongTotal;

    // Reveal Explanation and Disable Check Button
    qBox.querySelector('.explanation').style.display = 'block';
    qBox.querySelector('.check-btn').disabled = true;
}