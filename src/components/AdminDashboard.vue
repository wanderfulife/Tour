<template>
	<div>
		<button class="btn-signin" @click="showSignInModal = true">Connexion Admin</button>

		<!-- Sign In Modal -->
		<div v-if="showSignInModal" class="modal">
			<div class="modal-content signin-modal">
				<button class="close" @click="showSignInModal = false">&times;</button>
				<h2>Connexion Admin</h2>
				<input v-model="password" type="password" placeholder="Entrez le mot de passe" class="form-control">
				<button @click="signIn" class="btn-signin">Se connecter</button>
			</div>
		</div>

		<!-- Admin Dashboard Modal -->
		<div v-if="showAdminDashboard" class="modal">
			<div class="modal-content admin-dashboard">
				<button class="close" @click="showAdminDashboard = false">&times;</button>
				<h2>Tableau de Bord Admin</h2>
				<div class="dashboard-content">
					<div class="dashboard-card total">
						<h3>Total des Enquêtes</h3>
						<p class="big-number">{{ totalSurveys }}</p>
					</div>
					<div class="dashboard-card">
						<h3>Enquêtes par Enquêteur</h3>
						<ul>
							<li v-for="(count, name) in surveysByEnqueteur" :key="name">
								<span>{{ name }}</span>
								<span class="count">{{ count }}</span>
							</li>
						</ul>
					</div>
					<div class="dashboard-card">
						<h3>Enquêtes par Type</h3>
						<ul>
							<li v-for="(count, type) in surveysByType" :key="type">
								<span>{{ type }}</span>
								<span class="count">{{ count }}</span>
							</li>
						</ul>
					</div>
				</div>
				<button @click="downloadData" class="btn-download">Télécharger les Données</button>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import * as XLSX from 'xlsx';
import { questions } from './surveyQuestions';

const showSignInModal = ref(false);
const showAdminDashboard = ref(false);
const password = ref('');
const surveysByEnqueteur = ref({});
const surveysByType = ref({});
const totalSurveys = ref(0);

const surveyCollectionRef = collection(db, "ToursNavette");

const signIn = () => {
	if (password.value === 'admin123') {
		showSignInModal.value = false;
		fetchAdminData();
		showAdminDashboard.value = true;
	} else {
		alert('Mot de passe incorrect');
	}
};

const fetchAdminData = async () => {
	try {
		const querySnapshot = await getDocs(surveyCollectionRef);
		console.log("Retrieved data:", querySnapshot.docs.map(doc => doc.data()));
		const surveys = querySnapshot.docs.map(doc => doc.data());

		totalSurveys.value = surveys.length;

		surveysByEnqueteur.value = surveys.reduce((acc, survey) => {
			acc[survey.ENQUETEUR] = (acc[survey.ENQUETEUR] || 0) + 1;
			return acc;
		}, {});

		const typeQ1Count = surveys.reduce((acc, survey) => {
			const type = survey.Q1 === 4 ? 'Pas de titre' : 'Titre de transport';
			acc[type] = (acc[type] || 0) + 1;
			return acc;
		}, {});

		const typeQ2Count = surveys.reduce((acc, survey) => {
			const type = survey.Q2 === 1 ? 'Correspondance' : 'Pas de Correspondance';
			acc[type] = (acc[type] || 0) + 1;
			return acc;
		}, {});

		surveysByType.value = {
			'Titre de transport': typeQ1Count['Titre de transport'] || 0,
			'Pas de titre': typeQ1Count['Pas de titre'] || 0,
			'Correspondance': typeQ2Count['Correspondance'] || 0,
			'Pas de Correspondance': typeQ2Count['Pas de Correspondance'] || 0
		};
	} catch (error) {
		console.error("Erreur lors de la récupération des données :", error);
	}
};

const downloadData = async () => {
  try {
    const querySnapshot = await getDocs(surveyCollectionRef);

    const headerOrder = [
      'ID_questionnaire',
      'ENQUETEUR',
      'DATE',
      'JOUR',
      'HEURE_DEBUT',
      'HEURE_FIN',
      ...questions.map(q => q.id)
    ];

    const data = querySnapshot.docs.map(doc => {
      const docData = doc.data();
      return headerOrder.reduce((acc, key) => {
        switch (key) {
          case 'ID_questionnaire':
          case 'ENQUETEUR':
          case 'DATE':
          case 'JOUR':
          case 'HEURE_DEBUT':
          case 'HEURE_FIN':
            acc[key] = docData[key] || '';
            break;
          default:
            const question = questions.find(q => q.id === key);
            if (question) {
              if (question.type === 'commune' || question.type === 'station') {
                acc[key] = docData[key] || '';
                acc[`${key}_COMMUNE`] = docData[`${key}_COMMUNE`] || '';
                acc[`${key}_CODE_INSEE`] = docData[`${key}_CODE_INSEE`] || '';
              } else if (question.type === 'text') {
                acc[key] = docData[key] || '';
              } else {
                // For options questions
                const option = question.options.find(opt => opt.value === docData[key]);
                acc[key] = option ? option.text : (docData[key] || '');
              }
            } else {
              acc[key] = docData[key] || '';
            }
        }
        return acc;
      }, {});
    });

    const worksheet = XLSX.utils.json_to_sheet(data, { header: headerOrder });

    // Set column widths
    const colWidths = headerOrder.map(() => ({ wch: 20 }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Survey Data");

    // Use a timestamp in the filename to avoid overwriting
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    XLSX.writeFile(workbook, `Survey_Data_${timestamp}.xlsx`);

    console.log("File downloaded successfully");
  } catch (error) {
    console.error("Error downloading data:", error);
  }
};

onMounted(() => {
	// Initialization logic if needed
});
</script>

<style scoped>
.btn-signin {
	background-color: #4CAF50;
	color: #ffffff;
	border: none;
	cursor: pointer;
	font-size: 16px;
	font-weight: bold;
	padding: 12px 24px;
	border-radius: 30px;
	transition: all 0.3s ease;
	text-transform: uppercase;
	letter-spacing: 1px;
	box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	margin-bottom: 20px;
}

.btn-signin:hover {
	background-color: #45a049;
	box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
}

/* Keep the rest of the styles unchanged */
.btn-download {
	background-color: #3498db;
	color: white;
	border: none;
	padding: 10px 20px;
	border-radius: 5px;
	cursor: pointer;
	font-size: 16px;
	transition: background-color 0.3s;
	width: 100%;
	margin-top: 20px;
}

.btn-download:hover {
	background-color: #2980b9;
}

.modal {
	position: fixed;
	z-index: 1000;
	left: 0;
	top: 0;
	width: 100%;
	height: 100%;
	background-color: rgba(0, 0, 0, 0.5);
	display: flex;
	justify-content: center;
	align-items: center;
}

.modal-content {
	background-color: #2c3e50;
	color: #ecf0f1;
	padding: 20px;
	border-radius: 10px;
	max-width: 500px;
	width: 90%;
	max-height: 90vh;
	overflow-y: auto;
	position: relative;
}

.close {
	position: fixed;
	/* Change from absolute to fixed */
	right: 20px;
	top: 20px;
	font-size: 28px;
	font-weight: bold;
	color: #bdc3c7;
	background: none;
	border: none;
	cursor: pointer;
	z-index: 1010;
	/* Ensure it's above other content */
}

.close:hover {
	color: #ecf0f1;
}

.dashboard-content {
	display: grid;
	gap: 20px;
	margin-bottom: 20px;
}

.dashboard-card {
	background-color: #34495e;
	border-radius: 8px;
	padding: 15px;
}

.dashboard-card h3 {
	margin-top: 0;
	color: #3498db;
}

.dashboard-card ul {
	list-style-type: none;
	padding: 0;
	margin: 0;
}

.dashboard-card li {
	display: flex;
	justify-content: space-between;
	margin-bottom: 5px;
}

.big-number {
	font-size: 3em;
	font-weight: bold;
	color: #2ecc71;
	margin: 10px 0;
}

.count {
	font-weight: bold;
	color: #2ecc71;
}

.form-control {
	width: 100%;
	padding: 10px;
	margin-bottom: 10px;
	border: 1px solid #34495e;
	border-radius: 5px;
	background-color: #34495e;
	color: #ecf0f1;
}

@media (max-width: 600px) {
	.modal-content {
		width: 100%;
		height: 100%;
		border-radius: 0;
		max-height: 100vh;
	}

	.close {
		top: 10px;
		right: 10px;
	}
}
</style>