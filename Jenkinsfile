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
        sh 'cp ~/.env ./.env'
      }
    }
    stage('Run Tests') {
      steps {
        sh 'npm run test-jenkins'
        archiveArtifacts(artifacts: 'test-result/result.xml', allowEmptyArchive: true)
        junit 'test-result/result.xml'
      }
    }
  }
}