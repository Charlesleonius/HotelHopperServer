pipeline {
  agent {
    docker {
      image 'node:6'
    }

  }
  stages {
    stage('Install Dependencies') {
      steps {
        sh 'npm install'
      }
    }
    stage('Run Tests') {
      steps {
        sh 'npm run test-jenkins'
        junit(testResults: '*/report*.xml', allowEmptyResults: true)
      }
    }
  }
}