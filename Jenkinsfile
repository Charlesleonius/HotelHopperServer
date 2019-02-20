pipeline {
  agent {
    docker {
      image 'node:6'
    }

  }
  stages {
    stage('') {
      steps {
        sh '''npm install
npm test'''
      }
    }
  }
}