pipeline {
  agent any
  stages {
    stage('Build and Test') {
      steps {
        nodejs('Hotel Hopper') {
          sh '''npm install
npm test'''
        }

      }
    }
  }
}