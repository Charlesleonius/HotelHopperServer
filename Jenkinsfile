pipeline {
  agent any
  stages {
    stage('Install Dependencies') {
      steps {
        nodejs 'Hotel Hopper'
        sh 'npm install'
      }
    }
    stage('Test') {
      steps {
        sh 'npm test'
      }
    }
  }
}