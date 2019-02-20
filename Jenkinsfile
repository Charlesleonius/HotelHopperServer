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
      post {
        always {
          junit '/report.xml'

        }

      }
      steps {
        sh 'npm run test-jenkins'
        archiveArtifacts(artifacts: 'test-result/result.xml', allowEmptyArchive: true)
        junit 'test-result/result.xml'
      }
    }
  }
}