<template>
	<div class="app-container">
		<!-- Progress Bar -->
		<div v-if="currentStep === 'survey'" class="progress-bar">
			<div class="progress" :style="{ width: `${progress}%` }"></div>
		</div>

		<div class="content-container">
			<!-- Surveyor Input Step -->
			<div v-if="currentStep === 'surveyor'">
				<h2>Prénom enqueteur :</h2>
				<input class="form-control" type="text" v-model="surveyor" />
				<button v-if="surveyor && !isSurveyorSaved" @click="setSurveyor" class="btn-next">Next</button>
			</div>

			<!-- Start Survey Step -->
			<div v-else-if="currentStep === 'start'" class="start-survey-container">
				<h2>{{ startMessage }}</h2>
				<button @click="startSurvey" class="btn-next">START SURVEY</button>
			</div>

			<!-- Survey Questions Step -->
			<div v-else-if="currentStep === 'survey' && !isSurveyComplete">
				<div class="question-container">
					<h2>{{ currentQuestion.text }}</h2>

					<!-- Multiple Choice Questions -->
					<div v-if="!currentQuestion.freeText">
						<div v-for="(option, index) in currentQuestion.options" :key="index">
							<button @click="selectAnswer(option, index)" class="btn-option">
								{{ option.text }}
							</button>
						</div>
					</div>
					<!-- Free Text Questions -->
					<div v-else>
						<div class="input-container">
							<input v-model="freeTextAnswer" class="form-control" type="text"
								:placeholder="currentQuestion.freeTextPlaceholder || 'Your answer'" />
						</div>
						<button @click="handleFreeTextAnswer" class="btn-next" :disabled="!freeTextAnswer.trim()">
							{{ isLastQuestion ? 'Finish' : 'Next' }}
						</button>
					</div>
					<!-- Back Button -->
					<button @click="previousQuestion" class="btn-return" v-if="canGoBack">Back</button>
				</div>
			</div>

			<!-- Survey Complete Step -->
			<div v-else-if="isSurveyComplete" class="survey-complete">
				<h2>{{ completionMessage }}</h2>
				<button @click="resetSurvey" class="btn-next">New Survey</button>
			</div>

			<!-- Logo -->
			<img class="logo" :src="logoUrl" alt="Survey Logo">
		</div>

		<!-- Footer -->
		<div class="footer">
			<AdminDashboard />
			<div class="doc-count">Number of surveys: {{ docCount }}</div>
		</div>
	</div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { db } from "../firebaseConfig";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { doc, getDoc, setDoc } from "firebase/firestore";
import AdminDashboard from './AdminDashboard.vue';
import logoImage from '../assets/Alycelogo.webp'
import { questions } from './surveyQuestions.js'

// Refs
const docCount = ref(0);
const currentStep = ref('surveyor');
const startDate = ref('');
const surveyor = ref('');
const currentQuestionIndex = ref(0);
const answers = ref({});
const freeTextAnswer = ref('');
const questionPath = ref(['Q1']);
const isSurveyorSaved = ref(false);
const isSurveyComplete = ref(false);

// Configuration (customize these for each survey)
const startMessage = ref("Bonjour, je suis mandaté par SNCF Voyageurs – Axe TGV Atlantique pour réaliser une enquête, de très courte durée, sur l'utilisation de la « Navette Tours » - St -Pierre - des - Corps.");
const completionMessage = ref('Merci pour votre réponse et bonne journée.');
const logoUrl = ref(logoImage);
const questionsData = ref(questions);

// Firestore refs (update collection name as needed)
const surveyCollectionRef = collection(db, "ToursNavette");
const counterDocRef = doc(db, "countersTour", "surveyCounter");

// Computed properties
const currentQuestion = computed(() => {
  return currentQuestionIndex.value >= 0 && currentQuestionIndex.value < questionsData.value.length
    ? questionsData.value[currentQuestionIndex.value]
    : null;
});

const canGoBack = computed(() => questionPath.value.length > 1);

const isLastQuestion = computed(() => currentQuestionIndex.value === questionsData.value.length - 1);

const progress = computed(() => {
  if (currentStep.value !== 'survey') return 0;
  if (isSurveyComplete.value) return 100;
  const totalQuestions = questionsData.value.length;
  const currentQuestionNumber = currentQuestionIndex.value + 1;
  const isLastOrEnding = isLastQuestion.value ||
    (currentQuestion.value?.options?.some(option => option.next === 'end'));
  return isLastOrEnding ? 100 : Math.min(Math.round((currentQuestionNumber / totalQuestions) * 100), 99);
});

// Methods
const setSurveyor = () => {
  if (surveyor.value.trim() !== '') {
    currentStep.value = 'start';
    isSurveyorSaved.value = true;
  }
};

const startSurvey = () => {
  startDate.value = new Date().toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  currentStep.value = 'survey';
  currentQuestionIndex.value = 0;
  answers.value = {};
  isSurveyComplete.value = false;
};

const selectAnswer = (option, index) => {
  if (currentQuestion.value) {
    answers.value[currentQuestion.value.id] = index + 1;

    if (option.next === 'end') {
      finishSurvey();
    } else {
      nextQuestion(option.next);
    }
  }
};

const handleFreeTextAnswer = () => {
  if (currentQuestion.value) {
    answers.value[currentQuestion.value.id] = freeTextAnswer.value;
    if (currentQuestionIndex.value < questionsData.value.length - 1) {
      nextQuestion();
    } else {
      finishSurvey();
    }
  }
};

const nextQuestion = (forcedNextId = null) => {
  let nextQuestionId = forcedNextId;
  if (!nextQuestionId && currentQuestion.value) {
    nextQuestionId = currentQuestion.value.next;
  }

  if (nextQuestionId === 'end') {
    finishSurvey();
  } else if (nextQuestionId) {
    const nextIndex = questionsData.value.findIndex(q => q.id === nextQuestionId);
    if (nextIndex !== -1) {
      currentQuestionIndex.value = nextIndex;
      questionPath.value.push(nextQuestionId);
      freeTextAnswer.value = '';
    }
  }
};

const previousQuestion = () => {
  if (canGoBack.value) {
    questionPath.value.pop();
    const previousQuestionId = questionPath.value[questionPath.value.length - 1];
    const previousIndex = questionsData.value.findIndex(q => q.id === previousQuestionId);
    if (previousIndex !== -1) {
      currentQuestionIndex.value = previousIndex;
      delete answers.value[questionsData.value[currentQuestionIndex.value].id];
      freeTextAnswer.value = '';
    }
  }
};

const finishSurvey = async () => {
  isSurveyComplete.value = true;
  const now = new Date();
  const uniqueId = await getNextId();

  await addDoc(surveyCollectionRef, {
    ID_questionnaire: uniqueId,
	HEURE_DEBUT: startDate.value,
    DATE: now.toLocaleDateString("fr-FR").replace(/\//g, "-"),
    JOUR: now.toLocaleDateString("fr-FR", { weekday: 'long' }),
    ENQUETEUR: surveyor.value,
    HEURE_FIN: now.toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    ...answers.value
  });

  await getDocCount();
};

const resetSurvey = () => {
  currentStep.value = 'start';
  startDate.value = "";
  answers.value = {};
  currentQuestionIndex.value = 0;
  questionPath.value = ['Q1'];
  freeTextAnswer.value = '';
  isSurveyComplete.value = false;
};

const getDocCount = async () => {
  try {
    const querySnapshot = await getDocs(surveyCollectionRef);
    docCount.value = querySnapshot.size;
  } catch (error) {
    console.error("Error getting document count:", error);
  }
};

const getNextId = async () => {
  const counterDoc = await getDoc(counterDocRef);
  let counter = 1;

  if (counterDoc.exists()) {
    counter = counterDoc.data().value + 1;
  }

  await setDoc(counterDocRef, { value: counter });

  return `SURVEY-${counter.toString().padStart(6, '0')}`;
};

// Lifecycle hooks
onMounted(() => {
  getDocCount();
});
</script>

<style>
/* Base styles */
body {
	background-color: #2a3b63;
	margin: 0;
	padding: 0;
	font-family: Arial, sans-serif;
}

.app-container {
	display: flex;
	flex-direction: column;
	min-height: 100vh;
	background-color: #2a3b63;
	color: white;
}

/* Center the Start Survey button horizontally and vertically */
.start-survey-container {
	justify-content: center;
	/* Center horizontally */
	align-items: center;
	/* Center vertically */
	height: 50vh;
	/* Full viewport height */
	width: 100%;
	/* Full width */
	margin-bottom: 5%;
}

.content-container {
	flex-grow: 1;
	/* This allows the content to take up available space */
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 5% 0;
	width: 90%;
	max-width: 600px;
	margin: 0 auto;
	box-sizing: border-box;
	overflow-y: auto;
	/* Allow scrolling if content overflows */
}

.question-container {
	width: 100%;
	margin-bottom: 30px;
}

.input-container {
	display: flex;
	justify-content: center;
	/* Center horizontally */
	width: 100%;
	/* Take full width of the parent */
}

h2 {
	text-align: center;
	width: 100%;
}

.form-control {
	width: 100%;
	max-width: 400px;
	/* Maximum width of the input */
	padding: 10px;
	border-radius: 5px;
	border: 1px solid white;
	background-color: #333;
	color: white;
	font-size: 16px;
	margin-bottom: 15px;
	box-sizing: border-box;
	outline: none;
}

.btn-next,
.btn-return,
.btn-option {
	width: 100%;
	max-width: 400px;
	color: white;
	padding: 15px;
	margin-top: 10px;
	border: none;
	border-radius: 5px;
	cursor: pointer;
	font-size: 16px;
}

.btn-next {
	background-color: green;
}

.btn-return {
	background-color: grey;
	margin-top: 30px;
}

.btn-option {
	background-color: #4a5a83;
	text-align: left;
}

.logo {
	max-width: 25%;
	height: auto;
	margin-top: 40px;
	margin-bottom: 20px;
}

.footer {
	background: linear-gradient(to right, #4c4faf, #3f51b5);
	padding: 20px;
	text-align: center;
	width: 100%;
	box-sizing: border-box;
	position: relative;
	/* Keep the footer relative to its parent */
}

.btn-download {
	background-color: #ffffff;
	color: #4c4faf;
	border: none;
	cursor: pointer;
	font-size: 16px;
	font-weight: bold;
	padding: 10px 20px;
	border-radius: 25px;
	transition: all 0.3s ease;
	margin-bottom: 15px;
	text-transform: uppercase;
	letter-spacing: 1px;
}

.doc-count {
	font-size: 14px;
	opacity: 0.9;
}

.progress-bar {
	width: 100%;
	height: 10px;
	background-color: #e0e0e0;
	position: relative;
	overflow: hidden;
	margin-bottom: 20px;
}

.progress {
	height: 100%;
	background-color: #4caf50;
	transition: width 0.3s ease-in-out;
}

.commune-dropdown {
	max-height: 200px;
	overflow-y: auto;
	border: 1px solid #ccc;
}

.commune-option {
	padding: 5px;
	cursor: pointer;
}

.commune-option:hover {
	background-color: #f0f0f0;
}

@media screen and (max-width: 768px) {
	.question-container {
		margin-bottom: 20px;
	}

	.btn-return {
		margin-top: 20px;
	}

	.logo {
		margin-top: 30px;
	}
}

/* Ensure responsive centering */
@media screen and (max-width: 480px) {
	.form-control {
		max-width: 100%;
		/* Ensure full width on small screens */
	}
}

.btn-pdf {
	background-color: #ff9800;
	/* Orange color to make it distinct */
	color: white;
	padding: 15px;
	margin: 10px 0;
	border: none;
	border-radius: 5px;
	cursor: pointer;
	font-size: 16px;
	width: 100%;
	max-width: 400px;
	text-align: center;
	transition: background-color 0.3s;
}

.btn-pdf:hover {
	background-color: #f57c00;
	/* Darker orange on hover */
}

.modal {
	display: flex;
	position: fixed;
	z-index: 1;
	left: 0;
	top: 0;
	width: 100%;
	height: 100%;
	overflow: auto;
	background-color: rgba(0, 0, 0, 0.4);
	justify-content: center;
	align-items: center;
}

.modal-content {
	background-color: #fefefe;
	padding: 20px;
	border: 1px solid #888;
	width: 90%;
	max-width: 800px;
	position: relative;
}

.pdf-content {
	height: 80vh;
	display: flex;
	flex-direction: column;
}

.close {
	color: #aaa;
	float: right;
	font-size: 28px;
	font-weight: bold;
	cursor: pointer;
	position: absolute;
	right: 10px;
	top: 5px;
}

.close:hover,
.close:focus {
	color: black;
	text-decoration: none;
	cursor: pointer;
}

/* Ensure the PDF fits within the modal */
.pdf-content iframe {
	flex-grow: 1;
	border: none;
	margin-top: 20px;
}
</style>